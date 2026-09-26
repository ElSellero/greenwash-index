'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type ThreeEvent, useFrame, useLoader } from '@react-three/fiber';
import {
  AdditiveBlending, BufferGeometry, Color, Float32BufferAttribute, type Group, LinearFilter,
  Line as ThreeLine, LineBasicMaterial, type PerspectiveCamera, type Sprite, SpriteMaterial,
  SRGBColorSpace, type Texture, TextureLoader, Vector3,
} from 'three';
import { latLngToVector3 } from '@/lib/geo';
import { fanOut, type FanSlot } from '@/lib/globe/fanOut';
import { focusedVehicle, type GlobeVehicle } from '@/lib/globe/fleet';
import { useAppStore } from '@/lib/store';
import { CONFIG } from '@/config';
import { colorOf, STALE_COLOR } from './palette';
import { markerTextures } from './markerTextures';
import { VehicleLabel } from './VehicleLabel';

const ICON_PX: Record<string, number> = { jet: 26, yacht: 24 };
const PARKED_SCALE = 0.72;
const HIT_PX = 44;
const RING_PX = 14;
const SPIRAL_PX = 9;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const PING_PERIOD_S = 2.6;
const FAN_KM = 12;
const Y_AXIS = new Vector3(0, 1, 0);

const tmp = { a: new Vector3(), b: new Vector3(), cam: new Vector3(), off: new Vector3() };

const smoothstep = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/** Local north/east unit vectors on the sphere at `up`. */
const tangentFrame = (up: Vector3) => {
  const north = Y_AXIS.clone().addScaledVector(up, -up.y);
  if (north.lengthSq() < 1e-8) north.set(0, 0, -1);
  north.normalize();
  return { north, east: new Vector3().crossVectors(north, up) };
};

const glowMaterial = (map: Texture, color: Color) => new SpriteMaterial({
  map, color, transparent: true, depthWrite: false, toneMapped: false, blending: AdditiveBlending,
});

type MarkerProps = {
  vehicle: GlobeVehicle;
  isSelected: boolean;
  isHovered: boolean;
  showLabel: boolean;
  onHover: (vehicleId: number, hovering: boolean) => void;
  slot: FanSlot;
  icon: Texture;
  personName: string | undefined;
  animate: boolean;
};

const Marker = ({
  vehicle, isSelected, isHovered: hovered, showLabel, onHover, slot, icon, personName, animate,
}: MarkerProps) => {
  const group = useRef<Group>(null);
  const iconSprite = useRef<Sprite>(null);
  const hitSprite = useRef<Sprite>(null);
  const haloSprite = useRef<Sprite>(null);
  const pingSprite = useRef<Sprite>(null);
  const reticleSprite = useRef<Sprite>(null);
  const hubSprite = useRef<Sprite>(null);
  const link = useRef<ThreeLine<BufferGeometry, LineBasicMaterial>>(null);
  const facing = useRef(1);
  const select = useAppStore((s) => s.select);

  const airborne = vehicle.type === 'jet' && vehicle.status === 'moving';
  const stale = vehicle.status === 'stale';
  const color = stale ? STALE_COLOR : colorOf(vehicle.type);
  const seed = (vehicle.vehicleId * 0.618) % 1;

  const geo = useMemo(() => {
    const { globe } = CONFIG;
    const anchor = latLngToVector3(vehicle.lat, vehicle.lng, airborne ? globe.flightAltitude : globe.surfaceAltitude);
    const ground = latLngToVector3(vehicle.lat, vehicle.lng, globe.surfaceAltitude);
    const up = anchor.clone().normalize();
    const { north, east } = tangentFrame(up);
    const h = ((vehicle.heading ?? 0) * Math.PI) / 180;
    const heading = north.clone().multiplyScalar(Math.cos(h)).addScaledVector(east, Math.sin(h));
    const spiral = slot.count > 6;
    const a = spiral ? slot.index * GOLDEN_ANGLE : (2 * Math.PI * slot.index) / slot.count + Math.PI / 4;
    const fan = slot.count > 1
      ? north.clone().multiplyScalar(Math.cos(a)).addScaledVector(east, Math.sin(a))
      : null;
    const fanPx = spiral ? SPIRAL_PX * Math.sqrt(slot.index + 0.8) : RING_PX;
    return { anchor, ground, up, heading, fan, fanPx };
  }, [vehicle.lat, vehicle.lng, vehicle.heading, airborne, slot.index, slot.count]);

  const mats = useMemo(() => {
    const t = markerTextures();
    const tint = new Color(color);
    const iconMat = new SpriteMaterial({
      map: icon, transparent: true, depthWrite: false, toneMapped: false, color: tint,
    });
    const halo = glowMaterial(t.glow, tint.clone());
    const ping = glowMaterial(t.ring, tint.clone());
    const reticle = glowMaterial(t.reticle, new Color('#ffffff'));
    const hub = glowMaterial(t.dot, tint.clone());
    const hit = new SpriteMaterial({ visible: false });
    const link = new LineBasicMaterial({ color: tint, transparent: true, opacity: 0.45, depthWrite: false });
    return { iconMat, halo, ping, reticle, hub, hit, link };
  }, [icon, color]);

  const linkLine = useMemo(() => {
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new Float32BufferAttribute(new Float32Array(6), 3));
    return new ThreeLine(geometry, mats.link);
  }, [mats.link]);

  useEffect(() => () => {
    Object.values(mats).forEach((m) => m.dispose());
    linkLine.geometry.dispose();
  }, [mats, linkLine]);

  useFrame(({ camera, size, clock }, delta) => {
    const g = group.current, ic = iconSprite.current, hit = hitSprite.current;
    const halo = haloSprite.current, ping = pingSprite.current, reticle = reticleSprite.current;
    const hub = hubSprite.current, line = link.current;
    if (!g || !ic || !hit || !halo || !ping || !reticle || !hub || !line) return;
    const cam = camera as PerspectiveCamera;
    const worldPerPx = (2 * Math.tan((cam.fov * Math.PI) / 360) * cam.position.distanceTo(geo.anchor)) / size.height;

    const pos = tmp.a.copy(geo.anchor);
    if (geo.fan) pos.addScaledVector(geo.fan, geo.fanPx * worldPerPx);
    g.position.copy(pos);

    facing.current = tmp.cam.copy(cam.position).sub(pos).normalize().dot(geo.up);
    const vis = smoothstep(-0.02, 0.22, facing.current);
    g.visible = vis > 0.01;
    if (!g.visible) return;

    const zoom = Math.min(1.25, Math.max(0.8, 2.3 / cam.position.length()));
    const emphasis = isSelected ? 1.45 : hovered ? 1.3 : vehicle.status === 'moving' ? 1 : PARKED_SCALE;
    const px = (ICON_PX[vehicle.type] ?? 24) * zoom * emphasis;
    const s = px * worldPerPx;
    ic.scale.set(s, s, 1);
    ic.material.opacity = vis * (stale ? 0.45 : vehicle.status === 'parked' && !isSelected && !hovered ? 0.85 : 1);
    ic.material.color.set(isSelected ? '#ffffff' : color);
    const p0 = tmp.b.copy(pos).project(cam);
    const p1 = tmp.off.copy(pos).addScaledVector(geo.heading, 1e-3).project(cam);
    ic.material.rotation = Math.atan2((p1.y - p0.y) * size.height, (p1.x - p0.x) * size.width) - Math.PI / 2;
    hit.scale.set(HIT_PX * worldPerPx, HIT_PX * worldPerPx, 1);

    const t = clock.elapsedTime;
    const moving = vehicle.status === 'moving';
    const breathe = animate && moving ? 0.5 + 0.5 * Math.sin(t * 2.2 + seed * 6.28) : 0.5;
    halo.scale.setScalar(s * (isSelected ? 3 : moving ? 2.3 : 1.9));
    halo.material.opacity = vis * (stale ? 0.05 : isSelected ? 0.6 : moving ? 0.22 + 0.14 * breathe : 0.13);

    ping.visible = moving;
    if (moving) {
      const phase = animate ? (t / PING_PERIOD_S + seed) % 1 : 0.35;
      ping.scale.setScalar(s * (1.1 + 2.4 * phase));
      ping.material.opacity = vis * 0.7 * (1 - phase) ** 2;
    }

    reticle.visible = isSelected;
    if (isSelected) {
      reticle.scale.setScalar(s * 1.75);
      if (animate) reticle.material.rotation += delta * 0.35;
      reticle.material.opacity = vis * 0.9;
    }

    const tethered = geo.fan !== null || airborne;
    hub.visible = tethered;
    line.visible = tethered;
    if (tethered) {
      const base = geo.fan ? geo.anchor : geo.ground;
      hub.position.copy(base).sub(pos);
      hub.scale.setScalar(6 * worldPerPx);
      hub.material.opacity = vis * 0.8;
      const attr = line.geometry.getAttribute('position') as Float32BufferAttribute;
      attr.setXYZ(1, base.x - pos.x, base.y - pos.y, base.z - pos.z);
      attr.needsUpdate = true;
      line.geometry.computeBoundingSphere();
      line.material.opacity = vis * 0.4;
    }
  });

  const onOver = (e: ThreeEvent<PointerEvent>) => {
    if (facing.current < 0.05) return;
    e.stopPropagation();
    onHover(vehicle.vehicleId, true);
    document.body.style.cursor = 'pointer';
  };
  const onOut = () => { onHover(vehicle.vehicleId, false); document.body.style.cursor = 'auto'; };
  const onClick = (e: ThreeEvent<MouseEvent>) => {
    if (facing.current < 0.05) return;
    e.stopPropagation();
    select(vehicle.personId, vehicle.vehicleId);
  };

  return (
    <group ref={group}>
      <primitive ref={link} object={linkLine} renderOrder={4} />
      <sprite ref={hubSprite} material={mats.hub} renderOrder={4} />
      <sprite ref={haloSprite} material={mats.halo} renderOrder={4} />
      <sprite ref={pingSprite} material={mats.ping} renderOrder={4} />
      <sprite ref={reticleSprite} material={mats.reticle} renderOrder={5} />
      <sprite ref={iconSprite} material={mats.iconMat} renderOrder={6} />
      <sprite ref={hitSprite} material={mats.hit}
        onClick={onClick} onPointerOver={onOver} onPointerOut={onOut} />
      {showLabel && (
        <VehicleLabel vehicle={vehicle} personName={personName} emphasized={isSelected} />
      )}
    </group>
  );
};

export const VehicleMarkers = ({ vehicles, names, animate }: {
  vehicles: GlobeVehicle[];
  names: Map<number, string>;
  animate: boolean;
}) => {
  const [jetTex, yachtTex] = useLoader(TextureLoader, ['/icons/jet.svg', '/icons/yacht.svg']);
  useMemo(() => {
    for (const t of [jetTex!, yachtTex!]) {
      t.colorSpace = SRGBColorSpace;
      t.minFilter = LinearFilter;
      t.generateMipmaps = false;
    }
  }, [jetTex, yachtTex]);
  const selectedPersonId = useAppStore((s) => s.selectedPersonId);
  const selectedVehicleId = useAppStore((s) => s.selectedVehicleId);
  const focusedId = focusedVehicle(vehicles, selectedPersonId, selectedVehicleId)?.vehicleId;
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const onHover = useCallback((id: number, hovering: boolean) =>
    setHoveredId((current) => (hovering ? id : current === id ? null : current)), []);
  const slots = useMemo(() => fanOut(vehicles
    .filter((v) => v.status !== 'moving')
    .map((v) => ({ id: v.vehicleId, lat: v.lat, lng: v.lng })), FAN_KM), [vehicles]);
  return (
    <group>
      {vehicles.map((v) => (
        <Marker key={v.vehicleId} vehicle={v} animate={animate} isSelected={v.vehicleId === focusedId}
          isHovered={v.vehicleId === hoveredId} onHover={onHover}
          showLabel={hoveredId === null ? v.vehicleId === focusedId : v.vehicleId === hoveredId}
          slot={slots.get(v.vehicleId) ?? { index: 0, count: 1 }}
          icon={v.type === 'jet' ? jetTex! : yachtTex!}
          personName={names.get(v.personId)} />
      ))}
    </group>
  );
};
