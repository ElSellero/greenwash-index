/** Uniforms shared by the globe and its detail tiles, so both shade the same sun and clouds. */
export const cloudShift = { value: 0 };
/** 1 = full cloud layer; fades toward 0 as the camera dives below the clouds. */
export const cloudCover = { value: 1 };
