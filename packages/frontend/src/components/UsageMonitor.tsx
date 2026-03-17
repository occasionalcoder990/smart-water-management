import React, { useState, useEffect } from 'react';
import {
  Box, Typography, ToggleButtonGroup, ToggleButton, Grid, CircularProgress, Alert,
} from '@mui/material';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { usageApi, UsageStats, SavingsData } from '../api/usage';
import { Zone } from '../api/zones';

interface UsageMonitorProps { zones: Zone[]; }

const statCard = (label: string, value: string, sub: string, color: string) => (
  <Box sx={{ p: 2, borderRadius: 3, bgcolor: `${color}08`, border: `1px solid ${color}15` }}>
    <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 0.5 }}>{label}</Typography>
    <Typography variant="h5" sx={{ color, fontWeight: 700, lineHeight: 1.2 }}>{value}</Typography>
    <Typography variant="caption" sx={{ color: '#475569' }}>{sub}</Typography>
  </Box>
);

const UsageMonitor: React.FC<UsageMonitorProps> = ({ zones }) => {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);
  const [savings, setSavings] = useState<SavingsData | null>(null);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { loadUsageData(); }, [timeRange]);

  const loadUsageData = async () => {
    try {
      setLoading(true);
      const [statsData, savingsData] = await Promise.all([
        usageApi.getCurrent(timeRange), usageApi.getSavings(),
      ]);
      setUsageStats(statsData);
      setSavings(savingsData);
      setTrendData(generateTrendData(timeRange, statsData));
      setError(null);
    } catch (err: any) {
      setError('Failed to load usage data');
    } finally { setLoading(false); }
  };

  const generateTrendData = (range: string, stats: UsageStats) => {
    const pts = range === 'day' ? 24 : range === 'week' ? 7 : 30;
    const avg = stats.total / pts;
    return Array.from({ length: pts }, (_, i) => ({
      name: range === 'day' ? `${i}:00` : range === 'week'
        ? ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][i] : `${i+1}`,
      usage: Math.max(0, avg + (Math.random() - 0.5) * avg * 0.4),
    }));
  };

  const getZoneChartData = () => {
    if (!usageStats) return [];
    return Object.entries(usageStats.byZone).map(([zoneId, liters]) => {
      const zone = zones.find((z) => z.id === zoneId);
      return { name: zone?.name?.split(' ')[0] || zoneId.slice(0,6), liters };
    });
  };

  if (loading) return <Box sx={{ display:'flex', justifyContent:'center', p:4 }}><CircularProgress size={32} sx={{ color:'#6C63FF' }} /></Box>;
  if (error) return <Alert severity="error" sx={{ bgcolor:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)' }}>{error}</Alert>;

  const tt = { contentStyle: { backgroundColor:'#1E293B', border:'1px solid rgba(148,163,184,0.15)', borderRadius:12, color:'#F1F5F9' }, labelStyle: { color:'#94A3B8' } };

  return (
    <Box>
      <Box sx={{ display:'flex', justifyContent:'space-between', alignItems:'center', mb:2.5 }}>
        <Typography variant="subtitle1" sx={{ color:'#94A3B8' }}>Statistics</Typography>
        <ToggleButtonGroup value={timeRange} exclusive onChange={(_,v) => v && setTimeRange(v)} size="small">
          {['day','week','month'].map(r => (
            <ToggleButton key={r} value={r} sx={{ color:'#64748B', textTransform:'capitalize', px:2, borderColor:'rgba(148,163,184,0.15)',
              '&.Mui-selected': { bgcolor:'rgba(108,99,255,0.15)', color:'#6C63FF', borderColor:'rgba(108,99,255,0.3)' } }}>{r}</ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>
      <Grid container spacing={2} sx={{ mb:3 }}>
        <Grid item xs={4}>{statCard('Total Usage', `${usageStats?.total.toFixed(0)||0}L`, timeRange==='day'?'Today':timeRange==='week'?'This Week':'This Month', '#6C63FF')}</Grid>
        <Grid item xs={4}>{statCard('Water Saved', `${savings?.totalSaved.toFixed(0)||0}L`, `${savings?.percentageReduction.toFixed(1)||0}% reduction`, '#10B981')}</Grid>
        <Grid item xs={4}>{statCard('Cost Savings', `$${savings?.costSavings.toFixed(2)||'0.00'}`, 'Estimated', '#F59E0B')}</Grid>
      </Grid>
      {getZoneChartData().length > 0 && (<>
        <Box sx={{ mb:3 }}>
          <Typography variant="subtitle2" sx={{ color:'#94A3B8', mb:1.5 }}>Usage Trend</Typography>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
              <XAxis dataKey="name" tick={{ fill:'#64748B', fontSize:11 }} axisLine={{ stroke:'rgba(148,163,184,0.1)' }} />
              <YAxis tick={{ fill:'#64748B', fontSize:11 }} axisLine={{ stroke:'rgba(148,163,184,0.1)' }} />
              <Tooltip {...tt} />
              <Line type="monotone" dataKey="usage" stroke="#6C63FF" strokeWidth={2.5} dot={false} activeDot={{ r:5, fill:'#6C63FF', stroke:'#0B0F1A', strokeWidth:2 }} />
            </LineChart>
          </ResponsiveContainer>
        </Box>
        <Box>
          <Typography variant="subtitle2" sx={{ color:'#94A3B8', mb:1.5 }}>Usage by Zone</Typography>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={getZoneChartData()}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.08)" />
              <XAxis dataKey="name" tick={{ fill:'#64748B', fontSize:11 }} axisLine={{ stroke:'rgba(148,163,184,0.1)' }} />
              <YAxis tick={{ fill:'#64748B', fontSize:11 }} axisLine={{ stroke:'rgba(148,163,184,0.1)' }} />
              <Tooltip {...tt} />
              <Bar dataKey="liters" fill="#00D9FF" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Box>
      </>)}
    </Box>
  );
};

export default UsageMonitor;
