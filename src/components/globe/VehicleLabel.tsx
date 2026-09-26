'use client';
import { Html } from '@react-three/drei';
import type { GlobeVehicle } from '@/lib/globe/fleet';
import { describeStatus } from '@/lib/globe/status';

export const VehicleLabel = ({ vehicle, personName, emphasized }: {
  vehicle: GlobeVehicle;
  personName: string | undefined;
  emphasized: boolean;
}) => {
  const tone = vehicle.status === 'stale' ? 'text-dim' : vehicle.type === 'jet' ? 'text-jet' : 'text-yacht';
  return (
    <Html center zIndexRange={[15, 11]} style={{ pointerEvents: 'none' }}>
      <div className={`${emphasized ? '-translate-y-14' : '-translate-y-11'} whitespace-nowrap rounded-md border bg-abyss/85 px-2 py-1 text-center shadow-lg backdrop-blur
        ${emphasized ? 'border-white/30' : 'border-panel-edge'}`}>
        {personName && <p className="text-[11px] font-semibold leading-tight text-slate-100">{personName}</p>}
        <p className="text-[10px] leading-tight text-dim">{vehicle.vehicleName}</p>
        <p className={`font-num text-[9px] uppercase leading-tight tracking-wider ${tone}`}>
          {describeStatus(vehicle, new Date())}
        </p>
      </div>
    </Html>
  );
};
