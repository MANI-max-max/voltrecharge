import {
  CreditCard,
  Droplets,
  Flame,
  Landmark,
  Radio,
  ShieldCheck,
  Smartphone,
  Tv,
  Wifi,
  Zap,
} from 'lucide-react';

interface ServiceIconProps {
  name: string;
  className?: string;
}

export function ServiceIcon({ name, className = 'w-5 h-5' }: ServiceIconProps) {
  switch (name) {
    case 'Smartphone':
      return <Smartphone className={className} />;
    case 'Tv':
      return <Tv className={className} />;
    case 'Radio':
      return <Radio className={className} />;
    case 'Zap':
      return <Zap className={className} />;
    case 'Droplets':
      return <Droplets className={className} />;
    case 'Wifi':
      return <Wifi className={className} />;
    case 'Flame':
      return <Flame className={className} />;
    case 'ShieldCheck':
      return <ShieldCheck className={className} />;
    case 'Landmark':
      return <Landmark className={className} />;
    default:
      return <CreditCard className={className} />;
  }
}
