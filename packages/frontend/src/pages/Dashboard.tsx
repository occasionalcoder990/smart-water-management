import React, { useState, useEffect } from 'react';
import {
  Container,
  Grid,
  Typography,
  Button,
  AppBar,
  Toolbar,
  Box,
  Alert,
  Snackbar,
  Dialog,
  DialogContent,
  IconButton,
  Card,
  CardContent,
  Chip,
  Avatar,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  WaterDrop as WaterDropIcon,
  TrendingDown as TrendingDownIcon,
  Speed as SpeedIcon,
  Lightbulb as LightbulbIcon,
  PowerSettingsNew,
  FiberManualRecord,
  Logout as LogoutIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useWebSocket } from '../hooks/useWebSocket';
import { zonesApi, Zone } from '../api/zones';
import { waterApi } from '../api/water';
import ZoneCard from '../components/ZoneCard';
import WaterDeploymentControl from '../components/WaterDeploymentControl';
import UsageMonitor from '../components/UsageMonitor';
import AIRecommendationsPanel from '../components/AIRecommendationsPanel';
import ZoneConfiguration from '../components/ZoneConfiguration';

const glassCard = {
  bgcolor: 'rgba(17, 24, 39, 0.6)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(148, 163, 184, 0.08)',
  borderRadius: 4,
  boxShadow: '0 4px 30px rgba(0, 0, 0, 0.2)',
};

const sectionHeader = (icon: React.ReactNode, title: string, color: string) => (
  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5 }}>
    <Box sx={{
      width: 36, height: 36, borderRadius: 2,
      background: `${color}15`,
      display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 1.5,
    }}>
      {icon}
    </Box>
    <Typography variant="h6" sx={{ color: '#F1F5F9', fontSize: '1.05rem' }}>
      {title}
    </Typography>
  </Box>
);

const Dashboard: React.FC = () => {
  const { user, logout, token } = useAuth();
  const { isConnected, subscribe, on, off } = useWebSocket(token);
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [emergencyMode, setEmergencyMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deploymentProgress, setDeploymentProgress] = useState<any>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);

  useEffect(() => {
    loadZones();
    checkEmergencyStatus();
  }, []);

  useEffect(() => {
    if (zones.length > 0 && isConnected) {
      const zoneIds = zones.map((z) => z.id);
      subscribe(zoneIds);
      on('zone:status', handleZoneStatusChange);
      on('deployment:progress', handleDeploymentProgress);
      on('deployment:complete', handleDeploymentComplete);
      on('emergency:activated', handleEmergencyActivated);
      return () => {
        off('zone:status');
        off('deployment:progress');
        off('deployment:complete');
        off('emergency:activated');
      };
    }
  }, [zones, isConnected]);

  const loadZones = async () => {
    try {
      setLoading(true);
      const response = await zonesApi.getAll();
      setZones(response.zones);
      setError(null);
    } catch (err: any) {
      setError('Failed to load zones');
    } finally {
      setLoading(false);
    }
  };

  const checkEmergencyStatus = async () => {
    try {
      const response = await waterApi.getEmergencyStatus();
      setEmergencyMode(response.emergencyMode);
    } catch (err) {
      console.error('Failed to check emergency status:', err);
    }
  };

  const handleEmergencyStop = async () => {
    try {
      await waterApi.emergencyStop();
      setEmergencyMode(true);
    } catch (err: any) {
      setError('Failed to activate emergency stop');
    }
  };

  const handleEmergencyDeactivate = async () => {
    try {
      await waterApi.emergencyDeactivate();
      setEmergencyMode(false);
    } catch (err: any) {
      setError('Failed to deactivate emergency mode');
    }
  };

  const handleZoneStatusChange = (data: any) => {
    setZones((prev) =>
      prev.map((zone) =>
        zone.id === data.zoneId ? { ...zone, status: data.status } : zone
      )
    );
  };

  const handleDeploymentProgress = (data: any) => {
    setDeploymentProgress(data);
  };

  const handleDeploymentComplete = (data: any) => {
    setDeploymentProgress(null);
    setSuccessMessage(`Deployment complete: ${data.totalLiters}L deployed`);
    loadZones();
  };

  const handleDeploy = async (zoneId: string, liters: number) => {
    try {
      await waterApi.deploy({ zoneId, liters });
      setSuccessMessage(`Deployment started: ${liters}L`);
      loadZones();
    } catch (err: any) {
      throw err;
    }
  };

  const handleEmergencyActivated = () => {
    setEmergencyMode(true);
    loadZones();
  };

  return (
    <Box sx={{
      flexGrow: 1, minHeight: '100vh',
      background: 'radial-gradient(ellipse at 20% 0%, rgba(108, 99, 255, 0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(0, 217, 255, 0.05) 0%, transparent 50%), #0B0F1A',
    }}>
      {/* Premium App Bar */}
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          bgcolor: 'rgba(11, 15, 26, 0.8)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(148, 163, 184, 0.08)',
        }}
      >
        <Toolbar sx={{ px: { xs: 2, md: 4 } }}>
          <Box sx={{
            width: 38, height: 38, borderRadius: 2,
            background: 'linear-gradient(135deg, #6C63FF 0%, #00D9FF 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', mr: 2,
          }}>
            <WaterDropIcon sx={{ fontSize: 22, color: 'white' }} />
          </Box>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700, fontSize: '1.1rem', color: '#F1F5F9' }}>
            Smart Water
          </Typography>

          <Chip
            icon={<FiberManualRecord sx={{ fontSize: '10px !important', color: isConnected ? '#10B981 !important' : '#EF4444 !important' }} />}
            label={isConnected ? 'Live' : 'Offline'}
            size="small"
            sx={{
              mr: 2, bgcolor: isConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              color: isConnected ? '#10B981' : '#EF4444',
              border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
              '& .MuiChip-icon': { ml: 0.5 },
            }}
          />

          <Avatar sx={{ width: 32, height: 32, bgcolor: 'rgba(108, 99, 255, 0.15)', color: '#6C63FF', fontSize: 14, mr: 1 }}>
            {user?.username?.charAt(0).toUpperCase()}
          </Avatar>
          <Typography variant="body2" sx={{ mr: 2, color: '#94A3B8', display: { xs: 'none', sm: 'block' } }}>
            {user?.username}
          </Typography>

          <IconButton onClick={() => setConfigDialogOpen(true)} sx={{ color: '#94A3B8', mr: 0.5, '&:hover': { color: '#F1F5F9' } }}>
            <SettingsIcon fontSize="small" />
          </IconButton>
          <IconButton onClick={logout} sx={{ color: '#94A3B8', '&:hover': { color: '#EF4444' } }}>
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ pt: 3, pb: 4, px: { xs: 2, md: 4 } }}>
        {emergencyMode && (
          <Alert
            severity="error"
            sx={{
              mb: 3, bgcolor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)',
              '& .MuiAlert-icon': { color: '#EF4444' },
            }}
            action={
              <Button size="small" onClick={handleEmergencyDeactivate} sx={{ color: '#EF4444' }}>
                Deactivate
              </Button>
            }
          >
            Emergency Mode Active — All water deployments are stopped.
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3, bgcolor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Emergency Stop */}
          <Grid item xs={12}>
            <Button
              variant="contained"
              size="large"
              fullWidth
              onClick={handleEmergencyStop}
              disabled={emergencyMode}
              startIcon={<PowerSettingsNew />}
              sx={{
                py: 1.8, borderRadius: 3,
                background: emergencyMode
                  ? 'rgba(239, 68, 68, 0.15)'
                  : 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
                color: emergencyMode ? 'rgba(239, 68, 68, 0.5)' : 'white',
                fontSize: '1rem', fontWeight: 700, letterSpacing: '0.05em',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #F87171 0%, #EF4444 100%)',
                  boxShadow: '0 8px 32px rgba(239, 68, 68, 0.3)',
                  transform: 'translateY(-2px)',
                },
                '&:disabled': {
                  background: 'rgba(239, 68, 68, 0.1)',
                  color: 'rgba(239, 68, 68, 0.4)',
                  border: '1px solid rgba(239, 68, 68, 0.1)',
                },
                transition: 'all 0.3s ease',
              }}
            >
              EMERGENCY STOP
            </Button>
          </Grid>

          {/* Zones Section */}
          <Grid item xs={12}>
            <Card elevation={0} sx={{ ...glassCard, p: 3 }}>
              {sectionHeader(<SpeedIcon sx={{ fontSize: 20, color: '#6C63FF' }} />, 'Water Zones', '#6C63FF')}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2.5 }}>
                <Chip label={`${zones.length} zones`} size="small" sx={{ bgcolor: 'rgba(108, 99, 255, 0.1)', color: '#6C63FF' }} />
                {selectedZone && (
                  <Chip
                    label={`Selected: ${selectedZone.name}`}
                    size="small"
                    onDelete={() => setSelectedZone(null)}
                    sx={{ bgcolor: 'rgba(0, 217, 255, 0.1)', color: '#00D9FF' }}
                  />
                )}
              </Box>
              {loading ? (
                <Typography sx={{ color: '#64748B' }}>Loading zones...</Typography>
              ) : (
                <Grid container spacing={2}>
                  {zones.map((zone) => (
                    <Grid item xs={12} sm={6} md={4} lg={2.4} key={zone.id}>
                      <ZoneCard
                        zone={zone}
                        isSelected={selectedZone?.id === zone.id}
                        onSelect={(zoneId) => {
                          const z = zones.find((zn) => zn.id === zoneId);
                          setSelectedZone(z || null);
                        }}
                      />
                    </Grid>
                  ))}
                </Grid>
              )}
            </Card>
          </Grid>

          {/* Left Column */}
          <Grid item xs={12} lg={6}>
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <Card elevation={0} sx={{ ...glassCard, p: 3 }}>
                  {sectionHeader(<TrendingDownIcon sx={{ fontSize: 20, color: '#10B981' }} />, 'Usage Overview', '#10B981')}
                  <UsageMonitor zones={zones} />
                </Card>
              </Grid>
              <Grid item xs={12}>
                <Card elevation={0} sx={{ ...glassCard, p: 3 }}>
                  {sectionHeader(<WaterDropIcon sx={{ fontSize: 20, color: '#00D9FF' }} />, 'Water Deployment', '#00D9FF')}
                  <WaterDeploymentControl
                    selectedZone={selectedZone}
                    onDeploy={handleDeploy}
                    emergencyMode={emergencyMode}
                    deploymentProgress={deploymentProgress}
                  />
                </Card>
              </Grid>
            </Grid>
          </Grid>

          {/* Right Column */}
          <Grid item xs={12} lg={6}>
            <Card elevation={0} sx={{ ...glassCard, p: 3, height: '100%' }}>
              {sectionHeader(<LightbulbIcon sx={{ fontSize: 20, color: '#F59E0B' }} />, 'AI Recommendations', '#F59E0B')}
              <AIRecommendationsPanel zones={zones} onRecommendationAccepted={loadZones} />
            </Card>
          </Grid>
        </Grid>
      </Container>

      <Snackbar
        open={!!successMessage}
        autoHideDuration={4000}
        onClose={() => setSuccessMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity="success" sx={{ bgcolor: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10B981' }}>
          {successMessage}
        </Alert>
      </Snackbar>

      <Dialog
        open={configDialogOpen}
        onClose={() => setConfigDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogContent sx={{ p: 4 }}>
          <ZoneConfiguration
            zones={zones}
            onZonesChanged={() => {
              loadZones();
              setConfigDialogOpen(false);
            }}
          />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Dashboard;
