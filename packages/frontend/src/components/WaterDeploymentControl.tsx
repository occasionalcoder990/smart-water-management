import React, { useState, useEffect } from 'react';
import {
  Box, TextField, Button, Typography, LinearProgress,
  Dialog, DialogTitle, DialogContent, DialogActions, Alert, Chip,
} from '@mui/material';
import { Zone } from '../api/zones';

interface WaterDeploymentControlProps {
  selectedZone: Zone | null;
  onDeploy: (zoneId: string, liters: number) => Promise<void>;
  emergencyMode: boolean;
  deploymentProgress?: {
    deploymentId: string; zoneId: string; progress: number;
    litersDeployed: number; litersRemaining: number;
  } | null;
}

const WaterDeploymentControl: React.FC<WaterDeploymentControlProps> = ({
  selectedZone, onDeploy, emergencyMode, deploymentProgress,
}) => {
  const [volume, setVolume] = useState<string>('50');
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const quickSelectValues = [10, 25, 50, 100];

  useEffect(() => { setError(null); }, [selectedZone]);
  useEffect(() => {
    setIsDeploying(deploymentProgress && selectedZone ? deploymentProgress.zoneId === selectedZone.id : false);
  }, [deploymentProgress, selectedZone]);

  const validateVolume = (value: string): boolean => {
    const num = parseFloat(value);
    if (isNaN(num)) { setError('Enter a valid number'); return false; }
    if (num < 1) { setError('Minimum 1 liter'); return false; }
    if (num > 1000) { setError('Maximum 1000 liters'); return false; }
    if (selectedZone && num > selectedZone.maxVolume) { setError(`Max ${selectedZone.maxVolume}L for this zone`); return false; }
    setError(null); return true;
  };

  const handleVolumeChange = (value: string) => { setVolume(value); if (value) validateVolume(value); else setError(null); };
  const handleQuickSelect = (value: number) => { setVolume(value.toString()); validateVolume(value.toString()); };

  const handleDeployClick = () => {
    if (!selectedZone) { setError('Select a zone first'); return; }
    if (!validateVolume(volume)) return;
    setConfirmOpen(true);
  };

  const handleConfirmDeploy = async () => {
    setConfirmOpen(false);
    if (!selectedZone) return;
    try { await onDeploy(selectedZone.id, parseFloat(volume)); setError(null); }
    catch (err: any) { setError(err.response?.data?.error?.message || 'Failed to deploy water'); }
  };

  const isDisabled = !selectedZone || emergencyMode || isDeploying;

  return (
    <Box>
      {emergencyMode && (
        <Alert severity="error" sx={{ mb: 2, bgcolor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
          Emergency mode active. Deployment disabled.
        </Alert>
      )}

      {!selectedZone ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body2" sx={{ color: '#475569' }}>
            Select a zone above to deploy water
          </Typography>
        </Box>
      ) : (
        <Box>
          <Chip
            label={`${selectedZone.name} · ${selectedZone.type}`}
            size="small"
            sx={{ mb: 2.5, bgcolor: 'rgba(0,217,255,0.1)', color: '#00D9FF', border: '1px solid rgba(0,217,255,0.2)' }}
          />

          <TextField
            label="Volume (Liters)"
            type="number"
            value={volume}
            onChange={(e) => handleVolumeChange(e.target.value)}
            error={!!error}
            helperText={error || `1 — ${selectedZone.maxVolume}L`}
            fullWidth
            disabled={isDisabled}
            inputProps={{ min: 1, max: selectedZone.maxVolume, step: 1 }}
            sx={{ mb: 2 }}
          />

          <Box sx={{ display: 'flex', gap: 1, mb: 2.5 }}>
            {quickSelectValues.map((value) => (
              <Button
                key={value}
                variant={volume === value.toString() ? 'contained' : 'outlined'}
                size="small"
                onClick={() => handleQuickSelect(value)}
                disabled={isDisabled || value > selectedZone.maxVolume}
                sx={{
                  flex: 1, borderRadius: 2,
                  borderColor: 'rgba(148,163,184,0.15)',
                  color: volume === value.toString() ? 'white' : '#94A3B8',
                  bgcolor: volume === value.toString() ? 'rgba(108,99,255,0.8)' : 'transparent',
                  '&:hover': { bgcolor: volume === value.toString() ? 'rgba(108,99,255,0.9)' : 'rgba(148,163,184,0.08)' },
                }}
              >
                {value}L
              </Button>
            ))}
          </Box>

          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={handleDeployClick}
            disabled={isDisabled || !!error}
            sx={{
              py: 1.5, borderRadius: 3,
              background: 'linear-gradient(135deg, #00D9FF 0%, #6C63FF 100%)',
              fontWeight: 700, fontSize: '0.95rem',
              '&:hover': {
                background: 'linear-gradient(135deg, #33E1FF 0%, #8B83FF 100%)',
                boxShadow: '0 8px 32px rgba(0, 217, 255, 0.3)',
              },
              '&:disabled': { background: 'rgba(148,163,184,0.1)', color: 'rgba(148,163,184,0.4)' },
            }}
          >
            {isDeploying ? 'Deploying...' : 'Deploy Water'}
          </Button>

          {isDeploying && deploymentProgress && (
            <Box sx={{ mt: 2.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" sx={{ color: '#94A3B8' }}>
                  {deploymentProgress.litersDeployed.toFixed(1)}L deployed
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748B' }}>
                  {deploymentProgress.progress.toFixed(0)}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={deploymentProgress.progress}
                sx={{
                  height: 6, borderRadius: 3, bgcolor: 'rgba(148,163,184,0.08)',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 3,
                    background: 'linear-gradient(90deg, #6C63FF, #00D9FF)',
                  },
                }}
              />
            </Box>
          )}
        </Box>
      )}

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle sx={{ color: '#F1F5F9' }}>Confirm Deployment</DialogTitle>
        <DialogContent>
          <Typography sx={{ color: '#94A3B8' }}>
            Deploy {volume}L to {selectedZone?.name}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)} sx={{ color: '#64748B' }}>Cancel</Button>
          <Button onClick={handleConfirmDeploy} variant="contained"
            sx={{ background: 'linear-gradient(135deg, #00D9FF 0%, #6C63FF 100%)' }}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WaterDeploymentControl;
