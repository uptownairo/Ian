import Svg, { Circle, Path, Rect } from 'react-native-svg';

// lucide-react-native nu mai include sigle de brand: le desenăm în același stil (contur, 2px).
type P = { size?: number; color?: string };

export function InstagramIcon({ size = 24, color = 'currentColor' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Rect x={2} y={2} width={20} height={20} rx={5} ry={5} />
      <Path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <Circle cx={17.5} cy={6.5} r={0.5} fill={color} />
    </Svg>
  );
}

export function FacebookIcon({ size = 24, color = 'currentColor' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </Svg>
  );
}
