import React from 'react';
import { Box, Typography } from '@mui/material';
import {
  Kitchen,
  Bathroom,
  Yard,
  LocalLaundryService,
  WaterDrop,
} from '@mui/icons-material';
import { Zone } from '../api/zones';

interface ZoneCardProps {
  zone: Zone;
  isSelected: boolean;
  onSelect: (zoneId: string) => void;
}

const statusConfig: Record<string, { color: string; glow: string; label: string }> = {
  idle: { color: '#10B981', glow: 'rgba(16, 185, 129, 0.3)', label: 'Idle' },
  active: { color: '#00D9FF', glow: 'rgba(0, 217, 255, 0.3)', label: 'Active' },
  error: { color: '#EF4444', glow: 'rgba(239, 68, 68, 0.3)', label: 'Error' },
};

const ZoneCard: React.FC<ZoneCardProps> = ({ zone, isSelected, onSelect }) => {
  const getZoneIcon = () => {
    const iconSx = { fontSize: 28, color: isSelected ? '#6C63FF' : '#94A3B8' };
    switch (zone.type) {
      case 'kitchen': return <Kitchen sx={iconSx} />;
      case 'bathroom': return <Bathroom sx={iconSx} />;
      case 'garden': return <Yard sx={iconSx} />;
      case 'laundry': return <LocalLaundryService sx={iconSx} />;
      default: return <WaterDrop sx={iconSx} />;
    }
  };

  const status = statusConfig[zone.status] || statusConfig.idle;

  return (
    <Box
      onClick={() => onSelect(zone.id)}
      sx={{
        p: 2.5,
        borderRadius: 3,
        cursor: 'pointer',
        bgcolor: isSelected ? 'rgba(108, 99, 255, 0.08)' : 'rgba(30, 41, 59, 0.5)',
        border: isSelected ? '1px solid rgba(108, 99, 255, 0.4)' : '1px solid rgba(148, 163, 184, 0.08)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          bgcolor: isSelected ? 'rgba(108, 99, 255, 0.12)' : 'rgba(30, 41, 59, 0.8)',
          transform: 'translateY(-4px)',
          boxShadow: isSelected
            ? '0 12px 40px rgba(108, 99, 255, 0.2)'
            : '0 12px 40px rgba(0, 0, 0, 0.3)',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Box sx={{
          width: 44, height: 44, borderRadius: 2,
          bgcolor: isSelected ? 'rgba(108, 99, 255, 0.12)' : 'rgba(148, 163, 184, 0.06)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {getZoneIcon()}
        </Box>
        <Box sx={{
          width: 8, height: 8, borderRadius: '50%',
          bgcolor: status.color,
          boxShadow: `0 0 8px ${status.glow}`,
        }} />
      </Box>

      <Typography variant="subtitle1" sx={{ color: '#F1F5F9', mb: 0.5, fontSize: '0.95rem' }}>
        {zone.name}
      </Typography>

      <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 0.5 }}>
        {zone.type.charAt(0).toUpperCase() + zone.type.slice(1)} · {zone.maxVolume}L max
      </Typography>

      <Box sx={{
        display: 'inline-flex', alignItems: 'center', gap: 0.5,
        px: 1, py: 0.25, borderRadius: 1,
        bgcolor: `${status.color}15`,
      }}>
        <Typography variant="caption" sx={{ color: status.color, fontWeight: 600, fontSize: '0.7rem' }}>
          {status.label}
        </Typography>
      </Box>
    </Box>
  );
};

export default ZoneCard;
