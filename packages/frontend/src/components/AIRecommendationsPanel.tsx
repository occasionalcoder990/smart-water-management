import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Button, Chip, Alert, CircularProgress, Stack,
} from '@mui/material';
import {
  Lightbulb, Warning, Schedule, WbSunny, CheckCircle, AutoAwesome,
} from '@mui/icons-material';
import { recommendationsApi, Recommendation } from '../api/recommendations';
import { Zone } from '../api/zones';

interface AIRecommendationsPanelProps {
  zones: Zone[];
  onRecommendationAccepted?: () => void;
}

const typeConfig: Record<string, { icon: React.ReactNode; color: string; gradient: string }> = {
  volume_optimization: { icon: <Lightbulb sx={{ fontSize: 20 }} />, color: '#6C63FF', gradient: 'linear-gradient(135deg, rgba(108,99,255,0.1), rgba(108,99,255,0.02))' },
  leak_detection: { icon: <Warning sx={{ fontSize: 20 }} />, color: '#EF4444', gradient: 'linear-gradient(135deg, rgba(239,68,68,0.1), rgba(239,68,68,0.02))' },
  schedule_optimization: { icon: <Schedule sx={{ fontSize: 20 }} />, color: '#00D9FF', gradient: 'linear-gradient(135deg, rgba(0,217,255,0.1), rgba(0,217,255,0.02))' },
  seasonal_adjustment: { icon: <WbSunny sx={{ fontSize: 20 }} />, color: '#F59E0B', gradient: 'linear-gradient(135deg, rgba(245,158,11,0.1), rgba(245,158,11,0.02))' },
};

const AIRecommendationsPanel: React.FC<AIRecommendationsPanelProps> = ({ zones, onRecommendationAccepted }) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => { loadRecommendations(); }, []);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      const response = await recommendationsApi.getAll();
      setRecommendations(response.recommendations.filter((r) => r.status === 'active'));
      setError(null);
    } catch (err: any) { setError('Failed to load recommendations'); } finally { setLoading(false); }
  };

  const handleAccept = async (id: string) => {
    try {
      setActionLoading(id);
      await recommendationsApi.accept(id);
      setRecommendations((prev) => prev.filter((r) => r.id !== id));
      onRecommendationAccepted?.();
    } catch (err: any) { setError('Failed to accept recommendation'); } finally { setActionLoading(null); }
  };

  const handleDismiss = async (id: string) => {
    try {
      setActionLoading(id);
      await recommendationsApi.dismiss(id);
      setRecommendations((prev) => prev.filter((r) => r.id !== id));
    } catch (err: any) { setError('Failed to dismiss recommendation'); } finally { setActionLoading(null); }
  };

  const getZoneName = (zoneId: string | null) => {
    if (!zoneId) return 'All Zones';
    return zones.find((z) => z.id === zoneId)?.name || 'Unknown';
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress size={32} sx={{ color: '#F59E0B' }} /></Box>;

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2, bgcolor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {recommendations.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CheckCircle sx={{ fontSize: 48, color: '#10B981', mb: 1.5 }} />
          <Typography variant="subtitle1" sx={{ color: '#F1F5F9', mb: 0.5 }}>All Optimized</Typography>
          <Typography variant="body2" sx={{ color: '#64748B' }}>No recommendations at this time.</Typography>
        </Box>
      ) : (
        <Stack spacing={2}>
          {recommendations.map((rec) => {
            const config = typeConfig[rec.type] || typeConfig.volume_optimization;
            return (
              <Box
                key={rec.id}
                sx={{
                  p: 2.5, borderRadius: 3,
                  background: config.gradient,
                  border: `1px solid ${config.color}20`,
                  transition: 'all 0.2s ease',
                  '&:hover': { border: `1px solid ${config.color}40` },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1.5 }}>
                  <Box sx={{
                    width: 36, height: 36, borderRadius: 2,
                    bgcolor: `${config.color}15`, color: config.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {config.icon}
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="subtitle2" sx={{ color: '#F1F5F9', mb: 0.5 }}>{rec.title}</Typography>
                    <Chip label={getZoneName(rec.zoneId)} size="small"
                      sx={{ bgcolor: `${config.color}15`, color: config.color, fontSize: '0.7rem', height: 22 }} />
                  </Box>
                </Box>

                <Typography variant="body2" sx={{ color: '#94A3B8', mb: 1.5, fontSize: '0.85rem', lineHeight: 1.5 }}>
                  {rec.description}
                </Typography>

                {rec.estimatedSavings > 0 && (
                  <Box sx={{
                    display: 'inline-flex', alignItems: 'center', gap: 0.5,
                    px: 1.5, py: 0.5, borderRadius: 2,
                    bgcolor: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.15)', mb: 2,
                  }}>
                    <AutoAwesome sx={{ fontSize: 14, color: '#10B981' }} />
                    <Typography variant="caption" sx={{ color: '#10B981', fontWeight: 600 }}>
                      Save {rec.estimatedSavings.toFixed(0)}L/month
                    </Typography>
                  </Box>
                )}

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                  <Button size="small" onClick={() => handleDismiss(rec.id)} disabled={actionLoading === rec.id}
                    sx={{ color: '#64748B', '&:hover': { bgcolor: 'rgba(148,163,184,0.08)' } }}>
                    Dismiss
                  </Button>
                  <Button size="small" variant="contained" onClick={() => handleAccept(rec.id)} disabled={actionLoading === rec.id}
                    sx={{
                      background: `linear-gradient(135deg, ${config.color}, ${config.color}CC)`,
                      '&:hover': { boxShadow: `0 4px 20px ${config.color}40` },
                    }}>
                    {actionLoading === rec.id ? 'Applying...' : 'Accept'}
                  </Button>
                </Box>
              </Box>
            );
          })}
        </Stack>
      )}
    </Box>
  );
};

export default AIRecommendationsPanel;
