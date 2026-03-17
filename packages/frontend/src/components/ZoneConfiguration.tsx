import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
} from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { Zone, zonesApi, CreateZoneRequest } from '../api/zones';

interface ZoneConfigurationProps {
  zones: Zone[];
  onZonesChanged: () => void;
}

const ZoneConfiguration: React.FC<ZoneConfigurationProps> = ({ zones, onZonesChanged }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [zoneToDelete, setZoneToDelete] = useState<Zone | null>(null);
  
  const [formData, setFormData] = useState<CreateZoneRequest>({
    name: '',
    type: 'kitchen',
    maxVolume: 1000,
  });
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleOpenDialog = (zone?: Zone) => {
    if (zone) {
      setEditingZone(zone);
      setFormData({
        name: zone.name,
        type: zone.type,
        maxVolume: zone.maxVolume,
      });
    } else {
      setEditingZone(null);
      setFormData({
        name: '',
        type: 'kitchen',
        maxVolume: 1000,
      });
    }
    setError(null);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingZone(null);
    setError(null);
  };

  const validateForm = (): boolean => {
    if (!formData.name || formData.name.trim().length === 0) {
      setError('Zone name is required');
      return false;
    }
    if (formData.name.length > 50) {
      setError('Zone name must be 50 characters or less');
      return false;
    }
    if (!formData.maxVolume || formData.maxVolume < 1 || formData.maxVolume > 1000) {
      setError('Max volume must be between 1 and 1000 liters');
      return false;
    }
    if (!editingZone && zones.length >= 20) {
      setError('Maximum 20 zones allowed per user');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      if (editingZone) {
        await zonesApi.update(editingZone.id, formData);
      } else {
        await zonesApi.create(formData);
      }
      handleCloseDialog();
      onZonesChanged();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to save zone');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (zone: Zone) => {
    setZoneToDelete(zone);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!zoneToDelete) return;

    try {
      setLoading(true);
      await zonesApi.delete(zoneToDelete.id);
      setDeleteDialogOpen(false);
      setZoneToDelete(null);
      onZonesChanged();
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to delete zone');
      setDeleteDialogOpen(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">Zone Configuration</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
          disabled={zones.length >= 20}
        >
          Add Zone
        </Button>
      </Box>

      {zones.length >= 20 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Maximum of 20 zones reached. Delete a zone to add a new one.
        </Alert>
      )}

      {error && !dialogOpen && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <List>
        {zones.map((zone) => (
          <ListItem key={zone.id} divider>
            <ListItemText
              primary={zone.name}
              secondary={`${zone.type} • Max: ${zone.maxVolume}L • Status: ${zone.status}`}
            />
            <ListItemSecondaryAction>
              <IconButton edge="end" onClick={() => handleOpenDialog(zone)} sx={{ mr: 1 }}>
                <Edit />
              </IconButton>
              <IconButton
                edge="end"
                onClick={() => handleDeleteClick(zone)}
                disabled={zone.status === 'active'}
              >
                <Delete />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>

      {zones.length === 0 && (
        <Alert severity="info">
          No zones configured. Click "Add Zone" to create your first zone.
        </Alert>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{editingZone ? 'Edit Zone' : 'Add New Zone'}</DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            label="Zone Name"
            fullWidth
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            margin="normal"
            required
            helperText="1-50 characters"
          />

          <FormControl fullWidth margin="normal">
            <InputLabel>Zone Type</InputLabel>
            <Select
              value={formData.type}
              label="Zone Type"
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            >
              <MenuItem value="kitchen">Kitchen</MenuItem>
              <MenuItem value="bathroom">Bathroom</MenuItem>
              <MenuItem value="garden">Garden</MenuItem>
              <MenuItem value="laundry">Laundry</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </Select>
          </FormControl>

          <TextField
            label="Maximum Volume (Liters)"
            type="number"
            fullWidth
            value={formData.maxVolume}
            onChange={(e) => setFormData({ ...formData, maxVolume: parseInt(e.target.value) })}
            margin="normal"
            required
            inputProps={{ min: 1, max: 1000 }}
            helperText="1-1000 liters"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSave} variant="contained" disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Zone</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{zoneToDelete?.name}"? This action cannot be undone.
          </Typography>
          {zoneToDelete?.status === 'active' && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Cannot delete zone with active deployment.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={loading || zoneToDelete?.status === 'active'}
          >
            {loading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ZoneConfiguration;
