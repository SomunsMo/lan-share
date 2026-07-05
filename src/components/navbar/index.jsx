import React from 'react';
import { useLocation, useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { routes } from "../../pages/_router-map.jsx";

const icons = {
  home: (
    <svg viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
  ),
  textMsg: (
    <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="13" y2="17"/></svg>
  ),
  history: (
    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  ),
  setting: (
    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
  ),
};

function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const topItems = [];
  const bottomItems = [];
  routes.forEach(route => {
    if (route.navPosition === "top") {
      topItems.push(route);
    } else if (route.navPosition === "bottom") {
      bottomItems.push(route);
    }
  });

  const drawerWidth = 'var(--navbar-width, 256px)';

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          position: 'relative',
          bgcolor: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border)',
        },
      }}
    >
      <Box sx={{ p: '24px 20px 20px' }}>
        <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2, color: 'var(--on-surface)' }}>
          LAN Share
        </Typography>
        <Typography variant="caption" sx={{ fontWeight: 500, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--on-surface-variant)' }}>
          {t('navbar.tagline')}
        </Typography>
      </Box>

      <List sx={{ flex: 1, px: 1.5, py: 0 }}>
        {topItems.map((item, index) => (
          <ListItemButton
            key={index}
            selected={location.pathname === item.path}
            onClick={() => navigate(item.path)}
            sx={{
              borderRadius: 'var(--radius-md)',
              mb: 0.25,
              '&.Mui-selected': {
                bgcolor: 'var(--primary-container)',
                color: 'var(--on-primary-container)',
                '& .MuiListItemIcon-root': { color: 'var(--on-primary-container)' },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
              {icons[item.icon]}
            </ListItemIcon>
            <ListItemText primary={t(item.name)} slotProps={{ primary: { fontSize: 14, fontWeight: 500 } }} />
          </ListItemButton>
        ))}
      </List>

      <Divider sx={{ mx: 2.5 }} />

      <List sx={{ px: 1.5, py: 0.5 }}>
        {bottomItems.map((item, index) => (
          <ListItemButton
            key={index}
            selected={location.pathname === item.path}
            onClick={() => navigate(item.path)}
            sx={{
              borderRadius: 'var(--radius-md)',
              mb: 0.25,
              '&.Mui-selected': {
                bgcolor: 'var(--primary-container)',
                color: 'var(--on-primary-container)',
                '& .MuiListItemIcon-root': { color: 'var(--on-primary-container)' },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>
              {icons[item.icon]}
            </ListItemIcon>
            <ListItemText primary={t(item.name)} slotProps={{ primary: { fontSize: 14, fontWeight: 500 } }} />
          </ListItemButton>
        ))}
      </List>
    </Drawer>
  );
}

export default Navbar;
