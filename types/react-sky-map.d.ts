declare module 'react-sky-map' {
  interface SkyMapProps {
    latitude: number;
    longitude: number;
    date: Date;
    width: string;
    height: string;
  }
  
  const SkyMap: React.FC<SkyMapProps>;
  export default SkyMap;
} 