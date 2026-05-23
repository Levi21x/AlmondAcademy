function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
// AlmondAI Icon Library — inline SVG components
// All icons 18×18 viewBox, stroke-based, Lucide-compatible

const IC = ({
  d,
  d2,
  w = 18,
  h = 18,
  sw = 1.75
}) => /*#__PURE__*/React.createElement("svg", {
  width: w,
  height: h,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: sw,
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, /*#__PURE__*/React.createElement("path", {
  d: d
}), d2 && /*#__PURE__*/React.createElement("path", {
  d: d2
}));
const ICP = ({
  children,
  w = 18,
  h = 18,
  sw = 1.75
}) => /*#__PURE__*/React.createElement("svg", {
  width: w,
  height: h,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: sw,
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, children);
const Icons = {
  dashboard: () => /*#__PURE__*/React.createElement(ICP, null, /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "3",
    width: "7",
    height: "8",
    rx: "1.5"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14",
    y: "3",
    width: "7",
    height: "5",
    rx: "1.5"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "14",
    y: "12",
    width: "7",
    height: "9",
    rx: "1.5"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "3",
    y: "15",
    width: "7",
    height: "6",
    rx: "1.5"
  })),
  brain: () => /*#__PURE__*/React.createElement(ICP, null, /*#__PURE__*/React.createElement("path", {
    d: "M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M17.599 6.5a3 3 0 0 0 .399-1.375"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M6.003 5.125A3 3 0 0 0 6.401 6.5"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M3.477 10.896a4 4 0 0 1 .585-.396"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M19.938 10.5a4 4 0 0 1 .585.396"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M6 18a4 4 0 0 1-1.967-.516"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M19.967 17.484A4 4 0 0 1 18 18"
  })),
  map: () => /*#__PURE__*/React.createElement(ICP, null, /*#__PURE__*/React.createElement("polygon", {
    points: "3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "9",
    y1: "3",
    x2: "9",
    y2: "18"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "15",
    y1: "6",
    x2: "15",
    y2: "21"
  })),
  clipboard: () => /*#__PURE__*/React.createElement(ICP, null, /*#__PURE__*/React.createElement("rect", {
    width: "8",
    height: "4",
    x: "8",
    y: "2",
    rx: "1",
    ry: "1"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 11h4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 16h4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 11h.01"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M8 16h.01"
  })),
  alert: () => /*#__PURE__*/React.createElement(ICP, null, /*#__PURE__*/React.createElement("path", {
    d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 9v4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 17h.01"
  })),
  trending: () => /*#__PURE__*/React.createElement(ICP, null, /*#__PURE__*/React.createElement("polyline", {
    points: "22 7 13.5 15.5 8.5 10.5 2 17"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "16 7 22 7 22 13"
  })),
  chart: () => /*#__PURE__*/React.createElement(ICP, null, /*#__PURE__*/React.createElement("line", {
    x1: "18",
    y1: "20",
    x2: "18",
    y2: "10"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "20",
    x2: "12",
    y2: "4"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "6",
    y1: "20",
    x2: "6",
    y2: "14"
  })),
  mic: () => /*#__PURE__*/React.createElement(ICP, null, /*#__PURE__*/React.createElement("path", {
    d: "M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M19 10v2a7 7 0 0 1-14 0v-2"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "19",
    x2: "12",
    y2: "22"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "8",
    y1: "22",
    x2: "16",
    y2: "22"
  })),
  settings: () => /*#__PURE__*/React.createElement(ICP, null, /*#__PURE__*/React.createElement("path", {
    d: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "3"
  })),
  user: () => /*#__PURE__*/React.createElement(ICP, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "8",
    r: "4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M20 21a8 8 0 1 0-16 0"
  })),
  flame: () => /*#__PURE__*/React.createElement(ICP, {
    sw: 1.6
  }, /*#__PURE__*/React.createElement("path", {
    d: "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3z"
  })),
  star: () => /*#__PURE__*/React.createElement(ICP, null, /*#__PURE__*/React.createElement("polygon", {
    points: "12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
  })),
  zap: () => /*#__PURE__*/React.createElement(IC, {
    d: "M13 2 3 14h9l-1 8 10-12h-9l1-8z"
  }),
  crown: () => /*#__PURE__*/React.createElement(ICP, null, /*#__PURE__*/React.createElement("path", {
    d: "M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87l5.188 1.71a.5.5 0 0 1 .274.688L18.9 16.192l.072 5.498a.5.5 0 0 1-.718.464L12 19.5l-6.254 2.654a.5.5 0 0 1-.718-.464l.072-5.498-1.952-4.924a.5.5 0 0 1 .274-.688l5.188-1.71z"
  })),
  send: () => /*#__PURE__*/React.createElement(ICP, null, /*#__PURE__*/React.createElement("path", {
    d: "m22 2-7 20-4-9-9-4Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M22 2 11 13"
  })),
  close: () => /*#__PURE__*/React.createElement(IC, {
    d: "M18 6 6 18M6 6l12 12"
  }),
  check: () => /*#__PURE__*/React.createElement(IC, {
    d: "M20 6 9 17l-5-5"
  }),
  plus: () => /*#__PURE__*/React.createElement(IC, {
    d: "M12 5v14M5 12h14"
  }),
  search: () => /*#__PURE__*/React.createElement(ICP, null, /*#__PURE__*/React.createElement("circle", {
    cx: "11",
    cy: "11",
    r: "8"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m21 21-4.3-4.3"
  })),
  bell: () => /*#__PURE__*/React.createElement(ICP, null, /*#__PURE__*/React.createElement("path", {
    d: "M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M10.3 21a1.94 1.94 0 0 0 3.4 0"
  })),
  image: () => /*#__PURE__*/React.createElement(ICP, null, /*#__PURE__*/React.createElement("rect", {
    width: "18",
    height: "18",
    x: "3",
    y: "3",
    rx: "2",
    ry: "2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "9",
    cy: "9",
    r: "2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"
  })),
  calendar: () => /*#__PURE__*/React.createElement(ICP, null, /*#__PURE__*/React.createElement("rect", {
    width: "18",
    height: "18",
    x: "3",
    y: "4",
    rx: "2"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "16",
    y1: "2",
    x2: "16",
    y2: "6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "8",
    y1: "2",
    x2: "8",
    y2: "6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "3",
    y1: "10",
    x2: "21",
    y2: "10"
  })),
  logout: () => /*#__PURE__*/React.createElement(ICP, null, /*#__PURE__*/React.createElement("path", {
    d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "16 17 21 12 16 7"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "21",
    y1: "12",
    x2: "9",
    y2: "12"
  })),
  sparkles: () => /*#__PURE__*/React.createElement(ICP, null, /*#__PURE__*/React.createElement("path", {
    d: "M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M20 3v4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M22 5h-4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M4 17v2"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M5 18H3"
  })),
  chevronRight: () => /*#__PURE__*/React.createElement(IC, {
    d: "m9 18 6-6-6-6"
  }),
  chevronLeft: () => /*#__PURE__*/React.createElement(IC, {
    d: "m15 18-6-6 6-6"
  }),
  chevronDown: () => /*#__PURE__*/React.createElement(IC, {
    d: "m6 9 6 6 6-6"
  }),
  info: () => /*#__PURE__*/React.createElement(ICP, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 16v-4"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M12 8h.01"
  })),
  eye: () => /*#__PURE__*/React.createElement(ICP, null, /*#__PURE__*/React.createElement("path", {
    d: "M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "3"
  })),
  target: () => /*#__PURE__*/React.createElement(ICP, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "6"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "2"
  })),
  trophy: () => /*#__PURE__*/React.createElement(ICP, null, /*#__PURE__*/React.createElement("path", {
    d: "M6 9H4.5a2.5 2.5 0 0 1 0-5H6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M18 9h1.5a2.5 2.5 0 0 0 0-5H18"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M4 22h16"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M18 2H6v7a6 6 0 0 0 12 0V2Z"
  })),
  playCircle: () => /*#__PURE__*/React.createElement(ICP, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("polygon", {
    points: "10 8 16 12 10 16 10 8"
  })),
  loader: () => /*#__PURE__*/React.createElement(ICP, null, /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "2",
    x2: "12",
    y2: "6"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "12",
    y1: "18",
    x2: "12",
    y2: "22"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "4.93",
    y1: "4.93",
    x2: "7.76",
    y2: "7.76"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "16.24",
    y1: "16.24",
    x2: "19.07",
    y2: "19.07"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "2",
    y1: "12",
    x2: "6",
    y2: "12"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "18",
    y1: "12",
    x2: "22",
    y2: "12"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "4.93",
    y1: "19.07",
    x2: "7.76",
    y2: "16.24"
  }), /*#__PURE__*/React.createElement("line", {
    x1: "16.24",
    y1: "7.76",
    x2: "19.07",
    y2: "4.93"
  })),
  book: () => /*#__PURE__*/React.createElement(ICP, null, /*#__PURE__*/React.createElement("path", {
    d: "M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"
  })),
  checkCircle: () => /*#__PURE__*/React.createElement(ICP, null, /*#__PURE__*/React.createElement("path", {
    d: "M22 11.08V12a10 10 0 1 1-5.93-9.14"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m9 11 3 3L22 4"
  })),
  xCircle: () => /*#__PURE__*/React.createElement(ICP, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m15 9-6 6"
  }), /*#__PURE__*/React.createElement("path", {
    d: "m9 9 6 6"
  })),
  clock: () => /*#__PURE__*/React.createElement(ICP, null, /*#__PURE__*/React.createElement("circle", {
    cx: "12",
    cy: "12",
    r: "10"
  }), /*#__PURE__*/React.createElement("polyline", {
    points: "12 6 12 12 16 14"
  }))
};

// Export to window
Object.assign(window, {
  Icons
});

// AlmondAI Sidebar Component

const NAV_ITEMS = [{
  id: 'dashboard',
  label: 'Dashboard',
  icon: 'dashboard'
}, {
  id: 'tutor',
  label: 'AI Tutor',
  icon: 'brain'
}, {
  id: 'syllabus',
  label: 'Syllabus Map',
  icon: 'map'
}, {
  id: 'practice',
  label: 'Practice MCQs',
  icon: 'clipboard'
}, {
  id: 'progress',
  label: 'Progress',
  icon: 'trending'
}, {
  id: 'planner',
  label: 'Planner',
  icon: 'calendar'
}, {
  id: 'insights',
  label: 'Insights',
  icon: 'chart',
  badge: '3 Critical',
  badgeColor: 'coral'
}, {
  id: 'voice',
  label: 'Voice Agent',
  icon: 'mic'
}, {
  id: 'visualise',
  label: 'Visualise',
  icon: 'image',
  badge: 'PRO',
  badgeColor: 'amber'
}];
const BOTTOM_ITEMS = [{
  id: 'profile',
  label: 'Profile',
  icon: 'user'
}, {
  id: 'settings',
  label: 'Settings',
  icon: 'settings'
}, {
  id: 'crisis',
  label: 'Crisis Mode',
  icon: 'alert',
  crisis: true,
  badge: 'FREE',
  badgeColor: 'green'
}];
const XPBar = ({
  xp,
  maxXp,
  level
}) => {
  const pct = Math.min(xp / maxXp * 100, 100);
  return /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "aa-flex-between",
    style: {
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "aa-label",
    style: {
      color: 'var(--aa-text-3)',
      fontSize: '0.63rem'
    }
  }, "XP ", xp.toLocaleString(), " / ", maxXp.toLocaleString()), /*#__PURE__*/React.createElement("span", {
    className: "aa-level"
  }, "LV ", level)), /*#__PURE__*/React.createElement("div", {
    className: "aa-prog-track",
    style: {
      height: 5
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "aa-prog-fill aa-prog-fill-teal",
    style: {
      width: `${pct}%`,
      animation: 'aaXpLoad 1.2s ease-out'
    }
  })));
};
const AlmondHearts = ({
  count = 4,
  max = 5
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 4,
    alignItems: 'center'
  }
}, Array.from({
  length: max
}).map((_, i) => /*#__PURE__*/React.createElement("span", {
  key: i,
  className: `aa-heart ${i < count ? 'on' : 'off'}`
}, i < count ? '🌰' : '·')));
const Sidebar = ({
  page,
  onNav,
  user
}) => {
  const [mode, setMode] = React.useState('MBBS');
  const [collapsed, setCollapsed] = React.useState(false);
  const badgeColors = {
    coral: 'aa-badge-coral',
    amber: 'aa-badge-amber',
    green: 'aa-badge-green',
    teal: 'aa-badge-teal'
  };
  return /*#__PURE__*/React.createElement("aside", {
    className: "aa-sidebar",
    style: {
      padding: '0 0 24px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '22px 20px 16px',
      borderBottom: '1px solid var(--aa-border)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 38,
      height: 38,
      borderRadius: 'var(--aa-r)',
      flexShrink: 0,
      background: 'linear-gradient(135deg, #f5a623 0%, #e07c00 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 18,
      boxShadow: '0 0 16px rgba(245,166,35,0.35)'
    }
  }, "\uD83C\uDF30"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--aa-fd)',
      fontWeight: 700,
      fontSize: '1.1rem',
      letterSpacing: '-0.02em',
      color: 'var(--aa-text-1)',
      lineHeight: 1
    }
  }, "AlmondAI"), /*#__PURE__*/React.createElement("div", {
    className: "aa-label",
    style: {
      color: 'var(--aa-teal)',
      fontSize: '0.6rem',
      marginTop: 2
    }
  }, "Medical Intelligence"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      background: 'var(--aa-bg)',
      borderRadius: 'var(--aa-r-full)',
      padding: 3,
      border: '1px solid var(--aa-border)'
    }
  }, ['MBBS', 'NEET-PG'].map(m => /*#__PURE__*/React.createElement("button", {
    key: m,
    onClick: () => setMode(m),
    style: {
      flex: 1,
      padding: '6px 0',
      borderRadius: 'var(--aa-r-full)',
      border: 'none',
      fontFamily: 'var(--aa-fb)',
      fontSize: '0.75rem',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.2s',
      background: mode === m ? 'var(--aa-amber-bg)' : 'transparent',
      color: mode === m ? 'var(--aa-amber)' : 'var(--aa-text-3)',
      boxShadow: mode === m ? '0 0 0 1px var(--aa-amber-border) inset' : 'none'
    }
  }, m)))), /*#__PURE__*/React.createElement("nav", {
    style: {
      flex: 1,
      padding: '12px 12px 0',
      overflowY: 'auto'
    },
    className: "no-scroll"
  }, /*#__PURE__*/React.createElement("div", {
    className: "aa-label",
    style: {
      color: 'var(--aa-text-3)',
      padding: '8px 8px 6px',
      fontSize: '0.6rem'
    }
  }, "Core"), NAV_ITEMS.map(item => {
    const Icon = Icons[item.icon];
    const active = page === item.id;
    return /*#__PURE__*/React.createElement("div", {
      key: item.id,
      className: `aa-nav-item ${active ? 'active' : ''}`,
      onClick: () => onNav(item.id),
      style: {
        marginBottom: 2
      }
    }, /*#__PURE__*/React.createElement(Icon, null), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }, item.label), item.badge && /*#__PURE__*/React.createElement("span", {
      className: `aa-badge ${badgeColors[item.badgeColor] || 'aa-badge-gray'}`,
      style: {
        fontSize: '0.6rem'
      }
    }, item.badge));
  }), /*#__PURE__*/React.createElement("div", {
    className: "aa-label",
    style: {
      color: 'var(--aa-text-3)',
      padding: '12px 8px 6px',
      fontSize: '0.6rem'
    }
  }, "Tools"), BOTTOM_ITEMS.map(item => {
    const Icon = Icons[item.icon];
    const active = page === item.id;
    return /*#__PURE__*/React.createElement("div", {
      key: item.id,
      className: `aa-nav-item ${item.crisis ? 'crisis-item' : ''} ${active ? 'active' : ''}`,
      onClick: () => onNav(item.id),
      style: {
        marginBottom: 2
      }
    }, /*#__PURE__*/React.createElement(Icon, null), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }, item.label), item.badge && /*#__PURE__*/React.createElement("span", {
      className: `aa-badge ${badgeColors[item.badgeColor] || 'aa-badge-gray'}`,
      style: {
        fontSize: '0.6rem'
      }
    }, item.badge));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px 16px 0',
      borderTop: '1px solid var(--aa-border)',
      marginTop: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      background: 'var(--aa-s2)',
      border: '1px solid var(--aa-border)',
      borderRadius: 'var(--aa-r-md)',
      padding: '10px 12px',
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 22,
      animation: 'aaFlicker 2s ease-in-out infinite',
      filter: 'drop-shadow(0 0 8px rgba(255,150,0,0.7))'
    }
  }, "\uD83D\uDD25"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--aa-fd)',
      fontWeight: 700,
      fontSize: '1rem',
      color: 'var(--aa-amber)',
      lineHeight: 1
    }
  }, user.streak, " day streak"), /*#__PURE__*/React.createElement("div", {
    className: "aa-caption",
    style: {
      fontSize: '0.7rem',
      marginTop: 2
    }
  }, "Keep it going!")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto'
    }
  }, /*#__PURE__*/React.createElement(AlmondHearts, {
    count: user.almonds,
    max: 5
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement(XPBar, {
    xp: user.xp,
    maxXp: user.maxXp,
    level: user.level
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      padding: '8px 6px',
      borderRadius: 'var(--aa-r)',
      cursor: 'pointer',
      transition: 'background 0.2s'
    },
    onMouseEnter: e => e.currentTarget.style.background = 'var(--aa-s2)',
    onMouseLeave: e => e.currentTarget.style.background = 'transparent',
    onClick: () => onNav('profile')
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 34,
      height: 34,
      borderRadius: 'var(--aa-r-full)',
      background: 'linear-gradient(135deg, var(--aa-s3), var(--aa-s4))',
      border: '2px solid var(--aa-amber-border)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 14,
      fontWeight: 700,
      color: 'var(--aa-amber)',
      fontFamily: 'var(--aa-fd)',
      flexShrink: 0
    }
  }, user.name[0]), /*#__PURE__*/React.createElement("div", {
    style: {
      minWidth: 0,
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "aa-body-sm",
    style: {
      fontWeight: 600,
      color: 'var(--aa-text-1)',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, user.name), /*#__PURE__*/React.createElement("div", {
    className: "aa-caption",
    style: {
      fontSize: '0.7rem',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap'
    }
  }, user.college)), user.isPremium && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--aa-amber)',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(Icons.crown, null)))));
};
Object.assign(window, {
  Sidebar,
  AlmondHearts,
  XPBar
});

// AlmondAI Dashboard Page

const QUICK_ACTIONS = [{
  id: 'tutor',
  label: 'AI Tutor',
  sub: 'Ask anything',
  icon: 'brain',
  color: 'var(--aa-amber)',
  bg: 'var(--aa-amber-bg)',
  border: 'var(--aa-amber-border)'
}, {
  id: 'practice',
  label: 'Practice MCQs',
  sub: '10 questions daily',
  icon: 'clipboard',
  color: 'var(--aa-teal)',
  bg: 'var(--aa-teal-bg)',
  border: 'var(--aa-teal-border)'
}, {
  id: 'syllabus',
  label: 'Syllabus Map',
  sub: 'Track your topics',
  icon: 'map',
  color: 'var(--aa-purple)',
  bg: 'var(--aa-purple-bg)',
  border: 'rgba(157,120,255,0.28)'
}, {
  id: 'crisis',
  label: 'Crisis Mode',
  sub: 'Emergency revision',
  icon: 'alert',
  color: 'var(--aa-coral)',
  bg: 'var(--aa-coral-bg)',
  border: 'var(--aa-coral-border)'
}];
const ACHIEVEMENTS = [{
  emoji: '🔥',
  label: '7-Day Streak',
  earned: true
}, {
  emoji: '⚡',
  label: 'Speed Learner',
  earned: true
}, {
  emoji: '🏆',
  label: 'Topic Master',
  earned: false
}, {
  emoji: '💎',
  label: 'Perfect Score',
  earned: false
}];
const StatCard = ({
  icon,
  value,
  label,
  sub,
  color,
  onClick
}) => {
  const Icon = Icons[icon];
  return /*#__PURE__*/React.createElement("div", {
    className: "aa-card",
    onClick: onClick,
    style: {
      padding: '22px 20px',
      cursor: onClick ? 'pointer' : 'default',
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 2,
      background: `linear-gradient(90deg, ${color}, transparent)`,
      opacity: 0.6
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 8,
      borderRadius: 'var(--aa-r)',
      background: `rgba(${color === 'var(--aa-amber)' ? '245,166,35' : color === 'var(--aa-teal)' ? '15,212,192' : '255,107,91'},0.1)`,
      color
    }
  }, /*#__PURE__*/React.createElement(Icon, null)), sub && /*#__PURE__*/React.createElement("span", {
    className: "aa-caption",
    style: {
      fontSize: '0.7rem',
      color: 'var(--aa-text-3)'
    }
  }, sub)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--aa-fd)',
      fontSize: '2rem',
      fontWeight: 700,
      color: 'var(--aa-text-1)',
      lineHeight: 1
    }
  }, value), /*#__PURE__*/React.createElement("div", {
    className: "aa-label",
    style: {
      color: 'var(--aa-text-3)',
      marginTop: 6,
      fontSize: '0.65rem'
    }
  }, label));
};
const StreakDisplay = ({
  streak
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    background: 'linear-gradient(135deg, rgba(245,166,35,0.08) 0%, rgba(255,100,0,0.05) 100%)',
    border: '1px solid var(--aa-amber-border)',
    borderRadius: 'var(--aa-r-lg)',
    padding: '20px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: 20
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    textAlign: 'center'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontSize: '3.5rem',
    lineHeight: 1,
    animation: 'aaFlicker 2s ease-in-out infinite, aaStreakGlow 2.5s ease-in-out infinite'
  }
}, "\uD83D\uDD25")), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  style: {
    fontFamily: 'var(--aa-fd)',
    fontSize: '2.4rem',
    fontWeight: 800,
    color: 'var(--aa-amber)',
    lineHeight: 1,
    letterSpacing: '-0.03em'
  }
}, streak, " days"), /*#__PURE__*/React.createElement("div", {
  className: "aa-body",
  style: {
    color: 'var(--aa-text-2)',
    marginTop: 4
  }
}, "Study streak \u2014 you're on fire!"), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 4,
    marginTop: 10
  }
}, Array.from({
  length: 7
}).map((_, i) => /*#__PURE__*/React.createElement("div", {
  key: i,
  style: {
    width: 28,
    height: 28,
    borderRadius: 'var(--aa-r-sm)',
    background: i < 6 ? 'var(--aa-amber-bg)' : 'var(--aa-s2)',
    border: i < 6 ? '1px solid var(--aa-amber-border)' : '1px solid var(--aa-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13
  }
}, i < 6 ? '✓' : '·')))), /*#__PURE__*/React.createElement("div", {
  style: {
    marginLeft: 'auto',
    textAlign: 'right'
  }
}, /*#__PURE__*/React.createElement("div", {
  className: "aa-label",
  style: {
    color: 'var(--aa-text-3)',
    fontSize: '0.62rem',
    marginBottom: 6
  }
}, "Best streak"), /*#__PURE__*/React.createElement("div", {
  style: {
    fontFamily: 'var(--aa-fd)',
    fontSize: '1.4rem',
    fontWeight: 700,
    color: 'var(--aa-text-2)'
  }
}, "21 days")));
const XpSection = ({
  xp,
  maxXp,
  level
}) => {
  const pct = Math.min(xp / maxXp * 100, 100);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'var(--aa-s2)',
      border: '1px solid var(--aa-border)',
      borderRadius: 'var(--aa-r-lg)',
      padding: '18px 22px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 20
    }
  }, /*#__PURE__*/React.createElement(Icons.sparkles, null)), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "aa-h4",
    style: {
      color: 'var(--aa-text-1)'
    }
  }, "Level ", level, " \u2014 Resident"), /*#__PURE__*/React.createElement("div", {
    className: "aa-caption"
  }, (maxXp - xp).toLocaleString(), " XP to Level ", level + 1))), /*#__PURE__*/React.createElement("span", {
    className: "aa-level"
  }, "LV ", level)), /*#__PURE__*/React.createElement("div", {
    className: "aa-prog-track",
    style: {
      height: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "aa-prog-fill aa-prog-fill-teal",
    style: {
      width: `${pct}%`,
      animation: 'aaXpLoad 1.4s ease-out'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "aa-caption"
  }, xp.toLocaleString(), " XP"), /*#__PURE__*/React.createElement("span", {
    className: "aa-caption"
  }, maxXp.toLocaleString(), " XP")));
};
const TodayMission = ({
  onNav,
  questionsLeft,
  examName,
  examDays
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    position: 'relative',
    overflow: 'hidden',
    background: 'linear-gradient(135deg, #101e3a 0%, #0a1528 60%, #070c18 100%)',
    border: '1px solid rgba(15,212,192,0.2)',
    borderRadius: 'var(--aa-r-xl)',
    padding: '32px 36px'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 200,
    height: 200,
    background: 'radial-gradient(circle, rgba(15,212,192,0.08) 0%, transparent 70%)',
    pointerEvents: 'none'
  }
}), /*#__PURE__*/React.createElement("div", {
  style: {
    position: 'absolute',
    bottom: -40,
    left: 100,
    width: 160,
    height: 160,
    background: 'radial-gradient(circle, rgba(245,166,35,0.06) 0%, transparent 70%)',
    pointerEvents: 'none'
  }
}), /*#__PURE__*/React.createElement("div", {
  style: {
    position: 'relative'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12
  }
}, /*#__PURE__*/React.createElement("span", {
  className: "aa-badge aa-badge-teal"
}, "Today's Mission"), /*#__PURE__*/React.createElement("span", {
  className: "aa-badge aa-badge-amber"
}, new Date().toLocaleDateString('en-IN', {
  weekday: 'long'
}))), /*#__PURE__*/React.createElement("div", {
  className: "aa-h1",
  style: {
    color: 'var(--aa-text-1)',
    marginBottom: 8,
    maxWidth: 500
  }
}, "Your daily targets are ready, Arjun"), /*#__PURE__*/React.createElement("div", {
  className: "aa-body",
  style: {
    color: 'var(--aa-text-2)',
    marginBottom: 24,
    maxWidth: 440
  }
}, questionsLeft, " questions left today \xB7 ", examName, " in ", /*#__PURE__*/React.createElement("span", {
  style: {
    color: 'var(--aa-coral)',
    fontWeight: 600
  }
}, examDays, " days")), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10
  }
}, /*#__PURE__*/React.createElement("button", {
  className: "aa-btn aa-btn-teal aa-btn-sm",
  onClick: () => onNav('tutor')
}, /*#__PURE__*/React.createElement(Icons.sparkles, null), " Start Study Session"), /*#__PURE__*/React.createElement("button", {
  className: "aa-btn aa-btn-ghost aa-btn-sm",
  onClick: () => onNav('practice')
}, /*#__PURE__*/React.createElement(Icons.clipboard, null), " Practice MCQs")), /*#__PURE__*/React.createElement("div", {
  style: {
    marginTop: 22,
    paddingTop: 18,
    borderTop: '1px solid var(--aa-border)',
    display: 'flex',
    gap: 24
  }
}, [{
  label: 'Questions Today',
  value: '8 / 15',
  color: 'var(--aa-teal)'
}, {
  label: 'Accuracy',
  value: '82%',
  color: 'var(--aa-green)'
}, {
  label: 'Time Studied',
  value: '2.4 hrs',
  color: 'var(--aa-amber)'
}].map(item => /*#__PURE__*/React.createElement("div", {
  key: item.label
}, /*#__PURE__*/React.createElement("div", {
  style: {
    fontFamily: 'var(--aa-fd)',
    fontSize: '1.3rem',
    fontWeight: 700,
    color: item.color
  }
}, item.value), /*#__PURE__*/React.createElement("div", {
  className: "aa-label",
  style: {
    color: 'var(--aa-text-3)',
    fontSize: '0.62rem',
    marginTop: 2
  }
}, item.label))))));
const WeaknessAlert = ({
  onNav
}) => /*#__PURE__*/React.createElement("div", {
  className: "aa-card",
  style: {
    padding: '20px 22px'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 8
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    color: 'var(--aa-coral)'
  }
}, /*#__PURE__*/React.createElement(Icons.alert, null)), /*#__PURE__*/React.createElement("span", {
  className: "aa-h4"
}, "Weakness Alert")), /*#__PURE__*/React.createElement("button", {
  className: "aa-btn aa-btn-ghost aa-btn-xs",
  onClick: () => onNav('insights')
}, "View Insights \u2192")), /*#__PURE__*/React.createElement("div", {
  className: "aa-body-sm",
  style: {
    color: 'var(--aa-text-2)',
    marginBottom: 12
  }
}, "AI detected ", /*#__PURE__*/React.createElement("span", {
  style: {
    color: 'var(--aa-coral)',
    fontWeight: 600
  }
}, "3 critical gaps"), " that may cost you marks"), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8
  }
}, ['Cardiac Physiology', 'Renal Pharmacology', 'GI Anatomy'].map(t => /*#__PURE__*/React.createElement("span", {
  key: t,
  className: "aa-badge aa-badge-coral",
  style: {
    fontSize: '0.72rem',
    padding: '4px 10px'
  }
}, t))), /*#__PURE__*/React.createElement("div", {
  style: {
    marginTop: 14,
    height: 4,
    borderRadius: 'var(--aa-r-full)',
    background: 'var(--aa-s3)'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    height: '100%',
    width: '38%',
    borderRadius: 'var(--aa-r-full)',
    background: 'linear-gradient(90deg, var(--aa-coral), #ff9580)',
    boxShadow: '0 0 8px rgba(255,107,91,0.4)'
  }
})), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: 5
  }
}, /*#__PURE__*/React.createElement("span", {
  className: "aa-caption",
  style: {
    fontSize: '0.7rem'
  }
}, "Exam readiness"), /*#__PURE__*/React.createElement("span", {
  className: "aa-caption",
  style: {
    color: 'var(--aa-coral)',
    fontSize: '0.7rem',
    fontWeight: 600
  }
}, "38% \u2014 Needs work")));
const PeerWidget = () => /*#__PURE__*/React.createElement("div", {
  className: "aa-card",
  style: {
    padding: '20px 22px'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    color: 'var(--aa-teal)'
  }
}, /*#__PURE__*/React.createElement(Icons.target, null)), /*#__PURE__*/React.createElement("span", {
  className: "aa-h4"
}, "Peer Intelligence")), /*#__PURE__*/React.createElement("div", {
  className: "aa-body-sm",
  style: {
    color: 'var(--aa-text-2)',
    marginBottom: 12
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    color: 'var(--aa-teal)',
    fontWeight: 600
  }
}, "14 students"), " in your batch studied today"), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8
  }
}, [{
  name: 'Batch avg score',
  val: '71%',
  color: 'var(--aa-text-2)'
}, {
  name: 'Top topic today',
  val: 'Pathology',
  color: 'var(--aa-amber)'
}, {
  name: 'Students ahead of you',
  val: '3',
  color: 'var(--aa-coral)'
}].map(item => /*#__PURE__*/React.createElement("div", {
  key: item.name,
  style: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '7px 10px',
    background: 'var(--aa-s1)',
    borderRadius: 'var(--aa-r-sm)'
  }
}, /*#__PURE__*/React.createElement("span", {
  className: "aa-caption"
}, item.name), /*#__PURE__*/React.createElement("span", {
  style: {
    fontFamily: 'var(--aa-fd)',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: item.color
  }
}, item.val)))));
const RecentAchievement = () => /*#__PURE__*/React.createElement("div", {
  style: {
    background: 'linear-gradient(135deg, rgba(157,120,255,0.08) 0%, rgba(245,166,35,0.04) 100%)',
    border: '1px solid rgba(157,120,255,0.25)',
    borderRadius: 'var(--aa-r-lg)',
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: 14
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 52,
    height: 52,
    borderRadius: 'var(--aa-r-md)',
    flexShrink: 0,
    background: 'linear-gradient(135deg, rgba(157,120,255,0.2), rgba(245,166,35,0.1))',
    border: '1px solid rgba(157,120,255,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 24,
    boxShadow: '0 0 20px rgba(157,120,255,0.2)'
  }
}, "\uD83C\uDFC5"), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  className: "aa-label",
  style: {
    color: 'var(--aa-purple)',
    fontSize: '0.62rem',
    marginBottom: 3
  }
}, "Achievement Unlocked"), /*#__PURE__*/React.createElement("div", {
  className: "aa-h4",
  style: {
    color: 'var(--aa-text-1)'
  }
}, "7-Day Streak"), /*#__PURE__*/React.createElement("div", {
  className: "aa-caption"
}, "Studied 7 days in a row \xB7 +150 XP")), /*#__PURE__*/React.createElement("div", {
  style: {
    marginLeft: 'auto'
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    fontSize: 28
  }
}, "\u2728")));
const ExamCountdown = ({
  examName,
  daysLeft
}) => {
  const urgent = daysLeft < 20;
  const color = daysLeft < 10 ? 'var(--aa-coral)' : daysLeft < 30 ? 'var(--aa-amber)' : 'var(--aa-green)';
  return /*#__PURE__*/React.createElement("div", {
    className: "aa-card",
    style: {
      padding: '22px 20px',
      position: 'relative',
      overflow: 'hidden',
      background: urgent ? 'rgba(255,107,91,0.04)' : 'var(--aa-s2)',
      borderColor: urgent ? 'var(--aa-coral-border)' : 'var(--aa-border)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: urgent ? 'var(--aa-coral)' : 'var(--aa-text-2)'
    }
  }, /*#__PURE__*/React.createElement(Icons.calendar, null)), /*#__PURE__*/React.createElement("span", {
    className: `aa-badge ${urgent ? 'aa-badge-coral' : 'aa-badge-amber'}`
  }, "Upcoming")), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--aa-fd)',
      fontSize: '2.2rem',
      fontWeight: 800,
      color,
      lineHeight: 1
    }
  }, daysLeft), /*#__PURE__*/React.createElement("div", {
    className: "aa-label",
    style: {
      color: 'var(--aa-text-3)',
      marginTop: 4,
      fontSize: '0.65rem'
    }
  }, "Days to ", examName), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 12,
      display: 'flex',
      gap: 6
    }
  }, Array.from({
    length: 5
  }).map((_, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      flex: 1,
      height: 3,
      borderRadius: 2,
      background: i < Math.ceil(daysLeft / 60 * 5) ? color : 'var(--aa-s3)'
    }
  }))));
};
const Dashboard = ({
  onNav,
  user
}) => {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  return /*#__PURE__*/React.createElement("div", {
    className: "aa-page aa-anim-fade-up"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 28
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "aa-badge aa-badge-teal"
  }, "Learning Profile"), /*#__PURE__*/React.createElement("span", {
    className: "aa-badge aa-badge-gray"
  }, mode, " Mode")), /*#__PURE__*/React.createElement("div", {
    className: "aa-display",
    style: {
      color: 'var(--aa-text-1)',
      marginBottom: 6
    }
  }, greeting, ", ", user.name.split(' ')[0], " \uD83D\uDC4B"), /*#__PURE__*/React.createElement("div", {
    className: "aa-body-lg",
    style: {
      color: 'var(--aa-text-2)'
    }
  }, "AlmondAI is calibrated for your exam. Here's today's intelligence.")), /*#__PURE__*/React.createElement(TodayMission, {
    onNav: onNav,
    questionsLeft: 7,
    examName: "NEET-PG",
    examDays: 47
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: 14,
      margin: '20px 0'
    }
  }, /*#__PURE__*/React.createElement(StatCard, {
    icon: "flame",
    value: user.streak,
    label: "Day Streak",
    sub: "Personal best: 21",
    color: "var(--aa-amber)",
    onClick: () => onNav('progress')
  }), /*#__PURE__*/React.createElement(StatCard, {
    icon: "calendar",
    value: 47,
    label: "Days to NEET-PG",
    sub: "On track",
    color: "var(--aa-coral)"
  }), /*#__PURE__*/React.createElement(StatCard, {
    icon: "trending",
    value: "82%",
    label: "Today's Accuracy",
    sub: "\u2191 8% vs last week",
    color: "var(--aa-green)",
    onClick: () => onNav('progress')
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.4fr 1fr',
      gap: 14,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement(StreakDisplay, {
    streak: user.streak
  }), /*#__PURE__*/React.createElement(XpSection, {
    xp: user.xp,
    maxXp: user.maxXp,
    level: user.level
  })), /*#__PURE__*/React.createElement(RecentAchievement, null), /*#__PURE__*/React.createElement("div", {
    style: {
      margin: '20px 0'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "aa-flex-between",
    style: {
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "aa-h3"
  }, "Quick Access")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(4,1fr)',
      gap: 12
    }
  }, QUICK_ACTIONS.map(item => {
    const Icon = Icons[item.icon];
    return /*#__PURE__*/React.createElement("div", {
      key: item.id,
      onClick: () => onNav(item.id),
      style: {
        padding: '18px 16px',
        borderRadius: 'var(--aa-r-lg)',
        background: item.bg,
        border: `1px solid ${item.border}`,
        cursor: 'pointer',
        transition: 'all 0.2s'
      },
      onMouseEnter: e => {
        e.currentTarget.style.transform = 'translateY(-3px)';
        e.currentTarget.style.boxShadow = `0 8px 24px rgba(0,0,0,0.3)`;
      },
      onMouseLeave: e => {
        e.currentTarget.style.transform = '';
        e.currentTarget.style.boxShadow = '';
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        color: item.color,
        marginBottom: 10
      }
    }, /*#__PURE__*/React.createElement(Icon, null)), /*#__PURE__*/React.createElement("div", {
      className: "aa-h4",
      style: {
        color: 'var(--aa-text-1)',
        marginBottom: 3
      }
    }, item.label), /*#__PURE__*/React.createElement("div", {
      className: "aa-caption",
      style: {
        color: 'var(--aa-text-3)',
        fontSize: '0.7rem'
      }
    }, item.sub));
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: '1.3fr 1fr',
      gap: 14,
      marginBottom: 20
    }
  }, /*#__PURE__*/React.createElement(WeaknessAlert, {
    onNav: onNav
  }), /*#__PURE__*/React.createElement(PeerWidget, null)), /*#__PURE__*/React.createElement("div", {
    className: "aa-card",
    style: {
      padding: '22px 24px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "aa-flex-between",
    style: {
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "aa-h3"
  }, "Syllabus Progress"), /*#__PURE__*/React.createElement("button", {
    className: "aa-btn aa-btn-ghost aa-btn-xs",
    onClick: () => onNav('syllabus')
  }, "Full Map \u2192")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, [{
    name: 'Anatomy',
    pct: 72,
    color: 'var(--aa-amber)'
  }, {
    name: 'Physiology',
    pct: 58,
    color: 'var(--aa-teal)'
  }, {
    name: 'Biochemistry',
    pct: 45,
    color: 'var(--aa-purple)'
  }, {
    name: 'Pathology',
    pct: 31,
    color: 'var(--aa-coral)'
  }].map(s => /*#__PURE__*/React.createElement("div", {
    key: s.name,
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 12
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "aa-body-sm",
    style: {
      width: 110,
      flexShrink: 0,
      color: 'var(--aa-text-2)'
    }
  }, s.name), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      height: 5,
      background: 'var(--aa-s3)',
      borderRadius: 'var(--aa-r-full)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: `${s.pct}%`,
      borderRadius: 'var(--aa-r-full)',
      background: s.color,
      boxShadow: `0 0 6px ${s.color}50`,
      transition: 'width 1s ease-out'
    }
  })), /*#__PURE__*/React.createElement("span", {
    className: "aa-caption",
    style: {
      width: 32,
      textAlign: 'right',
      color: s.color,
      fontWeight: 600
    }
  }, s.pct, "%"))))));
};

// mode needs to be accessible in this scope
const mode = 'MBBS';
Object.assign(window, {
  Dashboard
});

// AlmondAI — AI Tutor Page

const MODELS = [{
  id: 'groq',
  label: 'Groq',
  sub: 'Fast',
  emoji: '⚡',
  color: 'var(--aa-amber)'
}, {
  id: 'gemini',
  label: 'Gemini',
  sub: 'Smart',
  emoji: '🔮',
  color: 'var(--aa-purple)'
}, {
  id: 'claude',
  label: 'Claude',
  sub: 'Deep',
  emoji: '🌿',
  color: 'var(--aa-teal)'
}];
const MODES = [{
  id: 'normal',
  label: 'Normal',
  icon: 'brain'
}, {
  id: 'search',
  label: 'Search',
  icon: 'search'
}, {
  id: 'visualise',
  label: 'Visualise',
  icon: 'image'
}];
const SAMPLE_MESSAGES = [{
  role: 'user',
  text: 'Explain the mechanism of action of ACE inhibitors in hypertension.'
}, {
  role: 'ai',
  text: `ACE inhibitors block the Angiotensin-Converting Enzyme, which normally converts Angiotensin I → Angiotensin II.\n\n**Why this matters:**\n- Angiotensin II is a potent vasoconstrictor\n- It also stimulates aldosterone release → sodium/water retention\n- ACE inhibitors break both pathways\n\n**Net effect:** ↓ SVR + ↓ blood volume → ↓ BP\n\n**High-yield exam point:** ACE inhibitors also decrease bradykinin breakdown (same enzyme), which causes the classic dry cough side effect. This is why ARBs are preferred in patients who can't tolerate ACE inhibitors.`
}, {
  role: 'user',
  text: 'What are the contraindications?'
}, {
  role: 'ai',
  text: `**Absolute contraindications:**\n1. **Pregnancy** — teratogenic (Category D), causes renal agenesis in fetus\n2. **Bilateral renal artery stenosis** — removes the protective Ang II effect on efferent arteriole, causing acute kidney injury\n3. **Hyperkalemia** — ACE-I reduce aldosterone → K⁺ retention\n4. **History of ACE-I-induced angioedema**\n\n**Remember this mnemonically:** *P-BRAK* — Pregnancy, Bilateral RAS, Renal failure (severe), Angioedema, K⁺ (hyperkalemia)`
}];
const TypingDots = () => /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    gap: 5,
    padding: '12px 16px',
    background: 'var(--aa-s2)',
    border: '1px solid var(--aa-border)',
    borderRadius: 'var(--aa-r-lg)',
    borderBottomLeftRadius: 4,
    width: 'fit-content'
  }
}, /*#__PURE__*/React.createElement("span", {
  style: {
    fontFamily: 'var(--aa-fd)',
    fontSize: '0.75rem',
    color: 'var(--aa-teal)',
    marginRight: 4
  }
}, "AlmondAI is thinking"), [0, 1, 2].map(i => /*#__PURE__*/React.createElement("div", {
  key: i,
  className: "aa-typing-dot",
  style: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    background: 'var(--aa-teal)',
    animation: `aaDotPulse 1.4s ease-in-out ${i * 0.2}s infinite`
  }
})));
const AIAvatar = ({
  size = 32
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    width: size,
    height: size,
    borderRadius: 'var(--aa-r-sm)',
    flexShrink: 0,
    background: 'linear-gradient(135deg, rgba(15,212,192,0.2), rgba(157,120,255,0.15))',
    border: '1.5px solid var(--aa-teal-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: size * 0.48,
    boxShadow: '0 0 12px var(--aa-teal-glow)'
  }
}, "\uD83C\uDF30");
const formatMessage = text => {
  // Simple markdown-ish rendering
  const lines = text.split('\n');
  return lines.map((line, i) => {
    let formatted = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/↑/g, '<span style="color:var(--aa-green)">↑</span>').replace(/↓/g, '<span style="color:var(--aa-coral)">↓</span>');
    if (line.startsWith('**') && line.endsWith('**')) {
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        dangerouslySetInnerHTML: {
          __html: formatted
        },
        style: {
          marginBottom: 4
        }
      });
    }
    if (line.match(/^\d+\./)) {
      return /*#__PURE__*/React.createElement("div", {
        key: i,
        dangerouslySetInnerHTML: {
          __html: formatted
        },
        style: {
          marginBottom: 3,
          paddingLeft: 4
        }
      });
    }
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      dangerouslySetInnerHTML: {
        __html: formatted
      },
      style: {
        marginBottom: line === '' ? 8 : 2
      }
    });
  });
};
const Message = ({
  msg
}) => {
  if (msg.role === 'user') {
    return /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        justifyContent: 'flex-end',
        marginBottom: 16
      }
    }, /*#__PURE__*/React.createElement("div", {
      className: "aa-bubble aa-bubble-user"
    }, msg.text));
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      marginBottom: 16,
      alignItems: 'flex-start'
    }
  }, /*#__PURE__*/React.createElement(AIAvatar, null), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: '76%'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      marginBottom: 5
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--aa-fd)',
      fontSize: '0.78rem',
      fontWeight: 600,
      color: 'var(--aa-teal)'
    }
  }, "AlmondAI"), /*#__PURE__*/React.createElement("span", {
    className: "aa-badge aa-badge-teal",
    style: {
      fontSize: '0.58rem'
    }
  }, "Claude")), /*#__PURE__*/React.createElement("div", {
    className: "aa-bubble aa-bubble-ai",
    style: {
      lineHeight: 1.7
    }
  }, formatMessage(msg.text)), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginTop: 6
    }
  }, /*#__PURE__*/React.createElement("button", {
    style: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'var(--aa-text-3)',
      fontSize: '0.72rem',
      fontFamily: 'var(--aa-fb)',
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      transition: 'color 0.15s'
    },
    onMouseEnter: e => e.target.style.color = 'var(--aa-teal)',
    onMouseLeave: e => e.target.style.color = 'var(--aa-text-3)'
  }, /*#__PURE__*/React.createElement(Icons.book, null), " Study this"), /*#__PURE__*/React.createElement("button", {
    style: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'var(--aa-text-3)',
      fontSize: '0.72rem',
      fontFamily: 'var(--aa-fb)',
      display: 'flex',
      alignItems: 'center',
      gap: 4,
      transition: 'color 0.15s'
    },
    onMouseEnter: e => e.target.style.color = 'var(--aa-amber)',
    onMouseLeave: e => e.target.style.color = 'var(--aa-text-3)'
  }, /*#__PURE__*/React.createElement(Icons.clipboard, null), " Practice MCQs"))));
};
const Tutor = ({
  onNav
}) => {
  const [messages, setMessages] = React.useState(SAMPLE_MESSAGES);
  const [input, setInput] = React.useState('');
  const [model, setModel] = React.useState('claude');
  const [chatMode, setChatMode] = React.useState('normal');
  const [typing, setTyping] = React.useState(false);
  const [sessionCount, setSessionCount] = React.useState(12);
  const msgEndRef = React.useRef(null);
  React.useEffect(() => {
    if (msgEndRef.current) msgEndRef.current.scrollIntoView({
      block: 'nearest',
      behavior: 'smooth'
    });
  }, [messages, typing]);
  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;
    setInput('');
    setMessages(m => [...m, {
      role: 'user',
      text
    }]);
    setTyping(true);
    try {
      const reply = await window.claude.complete({
        messages: [{
          role: 'user',
          content: `You are AlmondAI, a brilliant medical education AI for Indian MBBS/NEET-PG students. Answer this concisely but thoroughly for exam prep. Use bold for key terms and include high-yield exam points: ${text}`
        }]
      });
      setMessages(m => [...m, {
        role: 'ai',
        text: reply
      }]);
      setSessionCount(c => c + 1);
    } catch (e) {
      setMessages(m => [...m, {
        role: 'ai',
        text: 'I encountered an error. Please try again.'
      }]);
    } finally {
      setTyping(false);
    }
  };
  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  const SUGGESTED = ['What are the adverse effects of NSAIDs?', 'Explain cardiac output regulation', 'High-yield drugs for NEET-PG'];
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 0px)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px 24px',
      borderBottom: '1px solid var(--aa-border)',
      background: 'var(--aa-s1)',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement(AIAvatar, {
    size: 36
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "aa-h4"
  }, "AlmondAI Tutor"), /*#__PURE__*/React.createElement("div", {
    className: "aa-caption",
    style: {
      color: 'var(--aa-green)',
      fontSize: '0.7rem'
    }
  }, "\u25CF Online \xB7 Ready to teach")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      gap: 8,
      alignItems: 'center'
    }
  }, MODES.map(m => {
    const Icon = Icons[m.icon];
    return /*#__PURE__*/React.createElement("button", {
      key: m.id,
      className: `aa-pill ${chatMode === m.id ? 'active-teal' : ''}`,
      onClick: () => setChatMode(m.id),
      style: {
        padding: '5px 12px',
        fontSize: '0.78rem'
      }
    }, /*#__PURE__*/React.createElement(Icon, null), " ", m.label);
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '10px 24px',
      borderBottom: '1px solid var(--aa-border)',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      background: 'var(--aa-bg)',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "aa-label",
    style: {
      color: 'var(--aa-text-3)',
      fontSize: '0.62rem',
      marginRight: 4
    }
  }, "Engine:"), MODELS.map(m => /*#__PURE__*/React.createElement("button", {
    key: m.id,
    onClick: () => setModel(m.id),
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '6px 14px',
      borderRadius: 'var(--aa-r-full)',
      border: '1px solid',
      borderColor: model === m.id ? m.color + '50' : 'var(--aa-border)',
      background: model === m.id ? m.color + '10' : 'transparent',
      color: model === m.id ? m.color : 'var(--aa-text-3)',
      fontFamily: 'var(--aa-fb)',
      fontSize: '0.8rem',
      fontWeight: 600,
      cursor: 'pointer',
      transition: 'all 0.18s'
    }
  }, /*#__PURE__*/React.createElement("span", null, m.emoji), " ", m.label, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '0.65rem',
      opacity: 0.7
    }
  }, m.sub))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginLeft: 'auto',
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "aa-caption",
    style: {
      color: 'var(--aa-text-3)',
      fontSize: '0.7rem'
    }
  }, sessionCount, "/15 sessions today"), /*#__PURE__*/React.createElement("div", {
    style: {
      width: 60,
      height: 3,
      background: 'var(--aa-s3)',
      borderRadius: 'var(--aa-r-full)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      height: '100%',
      width: `${sessionCount / 15 * 100}%`,
      background: 'var(--aa-teal)',
      borderRadius: 'var(--aa-r-full)'
    }
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '24px'
    },
    className: "no-scroll"
  }, messages.map((msg, i) => /*#__PURE__*/React.createElement(Message, {
    key: i,
    msg: msg
  })), typing && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      alignItems: 'flex-start',
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement(AIAvatar, null), /*#__PURE__*/React.createElement(TypingDots, null)), /*#__PURE__*/React.createElement("div", {
    ref: msgEndRef
  })), messages.length <= 2 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '0 24px 12px',
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap'
    }
  }, SUGGESTED.map(s => /*#__PURE__*/React.createElement("button", {
    key: s,
    onClick: () => setInput(s),
    className: "aa-pill",
    style: {
      fontSize: '0.78rem'
    }
  }, s))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 24px',
      borderTop: '1px solid var(--aa-border)',
      background: 'var(--aa-s1)',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      alignItems: 'flex-end',
      background: 'var(--aa-s2)',
      border: '1px solid var(--aa-border)',
      borderRadius: 'var(--aa-r-xl)',
      padding: '12px 16px',
      transition: 'border-color 0.2s'
    },
    onFocusCapture: e => e.currentTarget.style.borderColor = 'var(--aa-amber-border)',
    onBlurCapture: e => e.currentTarget.style.borderColor = 'var(--aa-border)'
  }, /*#__PURE__*/React.createElement("textarea", {
    value: input,
    onChange: e => setInput(e.target.value),
    onKeyDown: handleKey,
    placeholder: "Ask anything about medicine... (Enter to send)",
    style: {
      flex: 1,
      background: 'none',
      border: 'none',
      outline: 'none',
      resize: 'none',
      fontFamily: 'var(--aa-fb)',
      fontSize: '0.9rem',
      color: 'var(--aa-text-1)',
      lineHeight: 1.55,
      minHeight: 24,
      maxHeight: 120,
      paddingTop: 2
    },
    rows: 1
  }), /*#__PURE__*/React.createElement("button", {
    onClick: sendMessage,
    disabled: !input.trim() || typing,
    style: {
      width: 38,
      height: 38,
      borderRadius: 'var(--aa-r-full)',
      border: 'none',
      background: input.trim() && !typing ? 'var(--aa-amber)' : 'var(--aa-s3)',
      color: input.trim() && !typing ? '#08100e' : 'var(--aa-text-3)',
      cursor: input.trim() && !typing ? 'pointer' : 'not-allowed',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      transition: 'all 0.2s',
      boxShadow: input.trim() && !typing ? '0 0 16px var(--aa-amber-glow)' : 'none'
    }
  }, typing ? /*#__PURE__*/React.createElement("div", {
    style: {
      width: 16,
      height: 16,
      border: '2px solid var(--aa-text-3)',
      borderTopColor: 'transparent',
      borderRadius: '50%',
      animation: 'aaSpinSlow 0.7s linear infinite'
    }
  }) : /*#__PURE__*/React.createElement(Icons.send, null))), /*#__PURE__*/React.createElement("div", {
    className: "aa-caption",
    style: {
      textAlign: 'center',
      marginTop: 8,
      fontSize: '0.68rem',
      color: 'var(--aa-text-3)'
    }
  }, "AlmondAI can make mistakes. Always verify with textbooks for exams.")));
};
Object.assign(window, {
  Tutor
});

// AlmondAI — MCQ Practice Page

const SUBJECTS = ['Anatomy', 'Physiology', 'Biochemistry', 'Pathology', 'Pharmacology', 'Microbiology', 'Forensic Medicine', 'Community Medicine', 'ENT', 'Ophthalmology', 'Medicine', 'Surgery'];
const SAMPLE_QUESTIONS = [{
  id: 1,
  subject: 'Anatomy',
  difficulty: 'medium',
  text: 'The nerve that passes through the carpal tunnel along with the flexor tendons is:',
  options: ['Ulnar nerve', 'Radial nerve', 'Median nerve', 'Anterior interosseous nerve'],
  correct: 2,
  explanation: 'The median nerve passes through the carpal tunnel along with 9 flexor tendons (FDS ×4, FDP ×4, FPL ×1). The ulnar nerve passes through Guyon\'s canal, not the carpal tunnel. Compression of the median nerve here causes Carpal Tunnel Syndrome (CTS) — thenar wasting + sensory loss over lateral 3½ fingers.'
}, {
  id: 2,
  subject: 'Physiology',
  difficulty: 'hard',
  text: 'During exercise, which of the following changes occurs in the oxygen-haemoglobin dissociation curve?',
  options: ['Shifts left due to decreased CO₂', 'Shifts right due to increased temperature and CO₂', 'Shifts left due to decreased 2,3-DPG', 'No shift occurs'],
  correct: 1,
  explanation: 'During exercise: ↑CO₂, ↑H⁺ (Bohr effect), ↑temperature, ↑2,3-DPG — all cause a rightward shift of the O₂-Hb dissociation curve. This means Hb releases O₂ more readily to working muscles. Remember: RIGHT shift = Release O₂ (good for tissues), LEFT shift = Load O₂ (good for lungs).'
}, {
  id: 3,
  subject: 'Pharmacology',
  difficulty: 'easy',
  text: 'Which of the following beta-blockers is cardioselective (β₁ selective)?',
  options: ['Propranolol', 'Carvedilol', 'Metoprolol', 'Labetalol'],
  correct: 2,
  explanation: 'Metoprolol, Atenolol, Bisoprolol, Esmolol are β₁-selective (cardioselective) beta-blockers. Mnemonic: "MABE" — Metoprolol, Atenolol, Bisoprolol, Esmolol. Propranolol and Carvedilol are non-selective. Labetalol blocks α₁, β₁, β₂. Cardioselective agents are preferred in asthma/COPD patients as they cause less bronchospasm.'
}, {
  id: 4,
  subject: 'Pathology',
  difficulty: 'medium',
  text: 'Reed-Sternberg cells are characteristically seen in:',
  options: ['Non-Hodgkin\'s lymphoma', 'Hodgkin\'s lymphoma', 'Burkitt\'s lymphoma', 'Multiple myeloma'],
  correct: 1,
  explanation: 'Reed-Sternberg cells are the pathognomonic cells of Hodgkin\'s Lymphoma. They are large binucleate/bilobed cells with prominent "owl-eye" nucleoli. Immunophenotype: CD15+, CD30+, CD20−. Burkitt\'s lymphoma shows "starry sky" pattern. Multiple myeloma has plasma cells with "clock-face" chromatin.'
}, {
  id: 5,
  subject: 'Biochemistry',
  difficulty: 'hard',
  text: 'Which vitamin deficiency leads to megaloblastic anemia WITHOUT neurological symptoms?',
  options: ['Vitamin B12', 'Vitamin B6', 'Folate', 'Vitamin B1'],
  correct: 2,
  explanation: 'Folate deficiency causes megaloblastic anemia WITHOUT neurological symptoms. Vitamin B12 deficiency causes both megaloblastic anemia AND subacute combined degeneration of spinal cord (posterior + lateral column involvement). This distinction is high-yield! Both B12 and Folate are required for DNA synthesis (thymidylate synthesis), but only B12 is needed for myelin synthesis.'
}];
const ConfettiParticle = ({
  x,
  color,
  delay
}) => /*#__PURE__*/React.createElement("div", {
  style: {
    position: 'fixed',
    left: x + 'vw',
    top: '-20px',
    width: 8,
    height: 8,
    background: color,
    borderRadius: 2,
    zIndex: 9999,
    animation: `aaConfettiDrop ${1.5 + Math.random()}s ease-in ${delay}s forwards`,
    transform: `rotate(${Math.random() * 360}deg)`
  }
});
const Confetti = () => {
  const colors = ['#f5a623', '#0fd4c0', '#9d78ff', '#35e8a6', '#ff6b5b', '#ffc85c'];
  const particles = Array.from({
    length: 60
  }, (_, i) => ({
    x: Math.random() * 100,
    color: colors[i % colors.length],
    delay: Math.random() * 0.8
  }));
  return /*#__PURE__*/React.createElement(React.Fragment, null, particles.map((p, i) => /*#__PURE__*/React.createElement(ConfettiParticle, _extends({
    key: i
  }, p))));
};
const difficultyColor = d => d === 'easy' ? 'var(--aa-green)' : d === 'hard' ? 'var(--aa-coral)' : 'var(--aa-amber)';
const optLetter = ['A', 'B', 'C', 'D'];
const Practice = ({
  onNav
}) => {
  const [phase, setPhase] = React.useState('setup'); // setup | session | result
  const [subject, setSubject] = React.useState('Anatomy');
  const [difficulty, setDifficulty] = React.useState('all');
  const [highYield, setHighYield] = React.useState(false);
  const [qIdx, setQIdx] = React.useState(0);
  const [selected, setSelected] = React.useState(null);
  const [submitted, setSubmitted] = React.useState(false);
  const [showExp, setShowExp] = React.useState(false);
  const [answers, setAnswers] = React.useState([]);
  const [almonds, setAlmonds] = React.useState(5);
  const [losingHeart, setLosingHeart] = React.useState(null);
  const [showConfetti, setShowConfetti] = React.useState(false);
  const [xpGained, setXpGained] = React.useState(0);
  const [xpFlash, setXpFlash] = React.useState(null);
  const questions = SAMPLE_QUESTIONS;
  const q = questions[qIdx];
  const progress = qIdx / questions.length * 100;
  const correct = answers.filter(a => a.correct).length;
  const handleSubmit = () => {
    if (selected === null) return;
    const isCorrect = selected === q.correct;
    setSubmitted(true);
    setShowExp(!isCorrect);
    setAnswers(a => [...a, {
      correct: isCorrect
    }]);
    if (!isCorrect) {
      const newAlmonds = almonds - 1;
      setLosingHeart(almonds - 1);
      setTimeout(() => {
        setAlmonds(newAlmonds);
        setLosingHeart(null);
      }, 500);
    } else {
      const xp = difficulty === 'hard' ? 20 : difficulty === 'easy' ? 8 : 12;
      setXpFlash('+' + xp + ' XP');
      setXpGained(g => g + xp);
      setTimeout(() => setXpFlash(null), 1500);
    }
  };
  const handleNext = () => {
    if (qIdx >= questions.length - 1) {
      if (correct / questions.length >= 0.7) setShowConfetti(true);
      setPhase('result');
      return;
    }
    setQIdx(i => i + 1);
    setSelected(null);
    setSubmitted(false);
    setShowExp(false);
  };
  const reset = () => {
    setPhase('setup');
    setQIdx(0);
    setSelected(null);
    setSubmitted(false);
    setShowExp(false);
    setAnswers([]);
    setAlmonds(5);
    setShowConfetti(false);
    setXpGained(0);
  };
  if (phase === 'setup') return /*#__PURE__*/React.createElement("div", {
    className: "aa-page aa-anim-fade-up"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 28
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "aa-h1",
    style: {
      marginBottom: 8
    }
  }, "Practice MCQs"), /*#__PURE__*/React.createElement("div", {
    className: "aa-body",
    style: {
      color: 'var(--aa-text-2)'
    }
  }, "Sharpen exam speed with intelligent question practice")), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 560
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "aa-card",
    style: {
      padding: '28px 28px 32px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "aa-h3",
    style: {
      marginBottom: 4
    }
  }, "Your Almonds"), /*#__PURE__*/React.createElement("div", {
    className: "aa-caption"
  }, "Lose one for each wrong answer")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6
    }
  }, Array.from({
    length: 5
  }).map((_, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    className: `aa-heart ${i < almonds ? 'on' : 'off'}`
  }, i < almonds ? '🌰' : '○')))), /*#__PURE__*/React.createElement("div", {
    className: "aa-divider",
    style: {
      marginBottom: 24
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 14
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "aa-label",
    style: {
      color: 'var(--aa-text-3)',
      marginBottom: 6,
      fontSize: '0.65rem'
    }
  }, "Subject"), /*#__PURE__*/React.createElement("select", {
    className: "aa-input",
    value: subject,
    onChange: e => setSubject(e.target.value)
  }, SUBJECTS.map(s => /*#__PURE__*/React.createElement("option", {
    key: s,
    value: s
  }, s)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "aa-label",
    style: {
      color: 'var(--aa-text-3)',
      marginBottom: 6,
      fontSize: '0.65rem'
    }
  }, "Difficulty"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8
    }
  }, ['all', 'easy', 'medium', 'hard'].map(d => /*#__PURE__*/React.createElement("button", {
    key: d,
    onClick: () => setDifficulty(d),
    className: `aa-pill ${difficulty === d ? d === 'hard' ? 'active' : d === 'easy' ? '' : 'active' : ''}`,
    style: {
      flex: 1,
      justifyContent: 'center',
      borderColor: difficulty === d ? difficultyColor(d) : 'var(--aa-border)',
      background: difficulty === d ? difficultyColor(d) + '15' : 'transparent',
      color: difficulty === d ? difficultyColor(d) : 'var(--aa-text-2)'
    }
  }, d === 'all' ? 'All' : d.charAt(0).toUpperCase() + d.slice(1))))), /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 14px',
      background: 'var(--aa-s1)',
      borderRadius: 'var(--aa-r)',
      border: '1px solid var(--aa-border)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "aa-body-sm",
    style: {
      fontWeight: 600
    }
  }, "High-Yield Only"), /*#__PURE__*/React.createElement("div", {
    className: "aa-caption",
    style: {
      fontSize: '0.7rem'
    }
  }, "Focus on most tested NEET-PG topics")), /*#__PURE__*/React.createElement("div", {
    onClick: () => setHighYield(h => !h),
    style: {
      width: 42,
      height: 24,
      borderRadius: 12,
      transition: 'all 0.2s',
      cursor: 'pointer',
      background: highYield ? 'var(--aa-amber)' : 'var(--aa-s3)',
      border: highYield ? 'none' : '1px solid var(--aa-border)',
      position: 'relative',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: 3,
      left: highYield ? 21 : 3,
      width: 18,
      height: 18,
      borderRadius: '50%',
      background: 'white',
      transition: 'left 0.2s',
      boxShadow: '0 1px 4px rgba(0,0,0,0.3)'
    }
  })))), /*#__PURE__*/React.createElement("button", {
    className: "aa-btn aa-btn-primary",
    style: {
      width: '100%',
      marginTop: 24,
      padding: '13px'
    },
    onClick: () => setPhase('session')
  }, /*#__PURE__*/React.createElement(Icons.playCircle, null), " Start 5-Question Session")), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 16,
      display: 'flex',
      gap: 10
    }
  }, [{
    label: 'Today\'s accuracy',
    val: '82%',
    color: 'var(--aa-green)'
  }, {
    label: 'Questions done',
    val: '47',
    color: 'var(--aa-teal)'
  }, {
    label: 'Streak',
    val: '14 days',
    color: 'var(--aa-amber)'
  }].map(s => /*#__PURE__*/React.createElement("div", {
    key: s.label,
    style: {
      flex: 1,
      padding: '12px 14px',
      background: 'var(--aa-s2)',
      border: '1px solid var(--aa-border)',
      borderRadius: 'var(--aa-r)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--aa-fd)',
      fontSize: '1.1rem',
      fontWeight: 700,
      color: s.color
    }
  }, s.val), /*#__PURE__*/React.createElement("div", {
    className: "aa-caption",
    style: {
      fontSize: '0.68rem',
      marginTop: 2
    }
  }, s.label))))));
  if (phase === 'result') return /*#__PURE__*/React.createElement("div", {
    className: "aa-page aa-anim-fade-up"
  }, showConfetti && /*#__PURE__*/React.createElement(Confetti, null), /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 520,
      margin: '0 auto',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '4rem',
      marginBottom: 16
    }
  }, correct >= 4 ? '🎉' : correct >= 3 ? '💪' : '📚'), /*#__PURE__*/React.createElement("div", {
    className: "aa-display",
    style: {
      marginBottom: 8
    }
  }, correct, "/", questions.length), /*#__PURE__*/React.createElement("div", {
    className: "aa-h3",
    style: {
      color: 'var(--aa-text-2)',
      marginBottom: 6
    }
  }, correct >= 4 ? 'Excellent work!' : correct >= 3 ? 'Good effort!' : 'Keep practising!'), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'center',
      marginBottom: 28
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 120,
      height: 120,
      borderRadius: '50%',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "120",
    height: "120",
    style: {
      position: 'absolute',
      top: 0,
      left: 0
    }
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "60",
    cy: "60",
    r: "52",
    fill: "none",
    stroke: "var(--aa-s3)",
    strokeWidth: "8"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "60",
    cy: "60",
    r: "52",
    fill: "none",
    strokeWidth: "8",
    stroke: correct >= 4 ? 'var(--aa-green)' : correct >= 3 ? 'var(--aa-amber)' : 'var(--aa-coral)',
    strokeLinecap: "round",
    strokeDasharray: `${correct / questions.length * 327} 327`,
    style: {
      transform: 'rotate(-90deg)',
      transformOrigin: 'center',
      transition: 'stroke-dasharray 1s ease-out'
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--aa-fd)',
      fontSize: '1.6rem',
      fontWeight: 700,
      color: correct >= 4 ? 'var(--aa-green)' : correct >= 3 ? 'var(--aa-amber)' : 'var(--aa-coral)'
    }
  }, Math.round(correct / questions.length * 100), "%"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 12,
      justifyContent: 'center',
      marginBottom: 28
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "aa-card",
    style: {
      padding: '14px 20px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--aa-teal)',
      fontFamily: 'var(--aa-fd)',
      fontSize: '1.3rem',
      fontWeight: 700
    }
  }, "+", xpGained), /*#__PURE__*/React.createElement("div", {
    className: "aa-caption",
    style: {
      fontSize: '0.7rem'
    }
  }, "XP Earned")), /*#__PURE__*/React.createElement("div", {
    className: "aa-card",
    style: {
      padding: '14px 20px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--aa-amber)',
      fontFamily: 'var(--aa-fd)',
      fontSize: '1.3rem',
      fontWeight: 700
    }
  }, almonds, "/5"), /*#__PURE__*/React.createElement("div", {
    className: "aa-caption",
    style: {
      fontSize: '0.7rem'
    }
  }, "Almonds Left")), /*#__PURE__*/React.createElement("div", {
    className: "aa-card",
    style: {
      padding: '14px 20px'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--aa-green)',
      fontFamily: 'var(--aa-fd)',
      fontSize: '1.3rem',
      fontWeight: 700
    }
  }, correct), /*#__PURE__*/React.createElement("div", {
    className: "aa-caption",
    style: {
      fontSize: '0.7rem'
    }
  }, "Correct"))), correct < 3 && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '16px 20px',
      background: 'rgba(15,212,192,0.07)',
      border: '1px solid var(--aa-teal-border)',
      borderRadius: 'var(--aa-r-lg)',
      marginBottom: 20,
      textAlign: 'left'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "aa-h4",
    style: {
      color: 'var(--aa-teal)',
      marginBottom: 4
    }
  }, "\uD83D\uDCA1 Review with AI Tutor"), /*#__PURE__*/React.createElement("div", {
    className: "aa-body-sm",
    style: {
      color: 'var(--aa-text-2)'
    }
  }, "Your score suggests this topic needs more depth. Let AlmondAI explain it with memory aids.")), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      justifyContent: 'center'
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "aa-btn aa-btn-primary",
    onClick: reset
  }, /*#__PURE__*/React.createElement(Icons.playCircle, null), " Practice Again"), /*#__PURE__*/React.createElement("button", {
    className: "aa-btn aa-btn-secondary",
    onClick: () => onNav('tutor')
  }, /*#__PURE__*/React.createElement(Icons.brain, null), " Ask AI Tutor"))));

  // Session
  return /*#__PURE__*/React.createElement("div", {
    className: "aa-page aa-anim-fade-up",
    style: {
      maxWidth: 640,
      margin: '0 auto'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 5
    }
  }, Array.from({
    length: 5
  }).map((_, i) => /*#__PURE__*/React.createElement("span", {
    key: i,
    className: `aa-heart ${i < almonds ? 'on' : 'off'} ${losingHeart === i ? 'lose' : ''}`
  }, i < almonds ? '🌰' : '○'))), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, xpFlash && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: -28,
      left: '50%',
      transform: 'translateX(-50%)',
      fontFamily: 'var(--aa-fd)',
      fontSize: '0.85rem',
      fontWeight: 700,
      color: 'var(--aa-teal)',
      animation: 'aaFadeUp 1.2s ease-out forwards',
      whiteSpace: 'nowrap'
    }
  }, xpFlash), /*#__PURE__*/React.createElement("span", {
    className: "aa-badge aa-badge-teal"
  }, qIdx + 1, " / ", questions.length)), /*#__PURE__*/React.createElement("span", {
    className: `aa-badge`,
    style: {
      background: difficultyColor(q.difficulty) + '20',
      color: difficultyColor(q.difficulty),
      border: `1px solid ${difficultyColor(q.difficulty)}50`
    }
  }, q.difficulty)), /*#__PURE__*/React.createElement("div", {
    className: "aa-prog-track",
    style: {
      height: 5,
      marginBottom: 22
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "aa-prog-fill",
    style: {
      width: `${progress}%`
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "aa-card",
    style: {
      padding: '28px 28px 24px',
      marginBottom: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginBottom: 16
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "aa-badge aa-badge-amber",
    style: {
      fontSize: '0.68rem'
    }
  }, q.subject)), /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--aa-fd)',
      fontSize: '1.05rem',
      fontWeight: 500,
      color: 'var(--aa-text-1)',
      lineHeight: 1.65,
      marginBottom: 24
    }
  }, q.text), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, q.options.map((opt, i) => {
    let cls = 'aa-mcq-opt';
    if (submitted) {
      cls += ' locked';
      if (i === q.correct) cls += ' correct';else if (i === selected && selected !== q.correct) cls += ' wrong';
    } else if (i === selected) {
      cls += ' selected';
    }
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: cls,
      onClick: () => !submitted && setSelected(i)
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 32,
        height: 32,
        borderRadius: 'var(--aa-r-sm)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'var(--aa-fd)',
        fontSize: '0.85rem',
        fontWeight: 700,
        background: submitted && i === q.correct ? 'var(--aa-green)' : submitted && i === selected && i !== q.correct ? 'var(--aa-coral)' : !submitted && i === selected ? 'var(--aa-amber)' : 'var(--aa-s3)',
        color: submitted && (i === q.correct || i === selected && i !== q.correct) || !submitted && i === selected ? '#06090f' : 'var(--aa-text-2)',
        border: '1px solid',
        borderColor: submitted && i === q.correct ? 'var(--aa-green)' : submitted && i === selected && i !== q.correct ? 'var(--aa-coral)' : !submitted && i === selected ? 'var(--aa-amber)' : 'var(--aa-border)',
        transition: 'all 0.15s'
      }
    }, optLetter[i]), /*#__PURE__*/React.createElement("span", {
      className: "aa-body-sm",
      style: {
        color: submitted && i === q.correct ? 'var(--aa-green)' : submitted && i === selected && i !== q.correct ? 'var(--aa-coral)' : 'var(--aa-text-1)'
      }
    }, opt), submitted && i === q.correct && /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: 'auto',
        color: 'var(--aa-green)',
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement(Icons.checkCircle, null)), submitted && i === selected && i !== q.correct && /*#__PURE__*/React.createElement("span", {
      style: {
        marginLeft: 'auto',
        color: 'var(--aa-coral)',
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement(Icons.xCircle, null)));
  })), /*#__PURE__*/React.createElement("button", {
    className: "aa-btn",
    style: {
      width: '100%',
      marginTop: 20,
      padding: '13px',
      background: !submitted && selected === null ? 'var(--aa-s3)' : 'var(--aa-amber)',
      color: !submitted && selected === null ? 'var(--aa-text-3)' : '#08100e',
      borderRadius: 'var(--aa-r-xl)',
      fontSize: '0.95rem',
      cursor: !submitted && selected === null ? 'not-allowed' : 'pointer',
      boxShadow: submitted || selected !== null ? '0 0 20px var(--aa-amber-glow)' : 'none'
    },
    onClick: submitted ? handleNext : handleSubmit,
    disabled: !submitted && selected === null
  }, !submitted && selected === null ? 'Choose an answer' : !submitted ? 'Check Answer →' : qIdx >= questions.length - 1 ? 'View Results 🎉' : 'Next Question →')), submitted && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '18px 22px',
      borderRadius: 'var(--aa-r-lg)',
      marginBottom: 14,
      background: selected === q.correct ? 'var(--aa-green-bg)' : 'var(--aa-coral-bg)',
      border: `1px solid ${selected === q.correct ? 'var(--aa-green-border)' : 'var(--aa-coral-border)'}`,
      animation: 'aaFadeUp 0.35s ease-out'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: selected === q.correct ? 'var(--aa-green)' : 'var(--aa-coral)'
    }
  }, selected === q.correct ? /*#__PURE__*/React.createElement(Icons.checkCircle, null) : /*#__PURE__*/React.createElement(Icons.xCircle, null)), /*#__PURE__*/React.createElement("span", {
    style: {
      fontFamily: 'var(--aa-fd)',
      fontWeight: 600,
      color: selected === q.correct ? 'var(--aa-green)' : 'var(--aa-coral)'
    }
  }, selected === q.correct ? 'Correct! Well done.' : 'Not quite — here\'s why:')), /*#__PURE__*/React.createElement("div", {
    className: "aa-body-sm",
    style: {
      color: 'var(--aa-text-1)',
      lineHeight: 1.7
    }
  }, q.explanation), !showExp && selected === q.correct && /*#__PURE__*/React.createElement("button", {
    className: "aa-body-sm",
    style: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'var(--aa-teal)',
      marginTop: 8,
      fontFamily: 'var(--aa-fb) '
    },
    onClick: () => setShowExp(true)
  }, "Show full explanation \u2193")));
};
Object.assign(window, {
  Practice
});

// AlmondAI — Syllabus Map Page

const SUBJECTS_DATA = [{
  id: 1,
  name: 'Anatomy',
  emoji: '🦴',
  pct: 72,
  topics: 18,
  done: 13,
  color: 'var(--aa-amber)',
  highYield: ['Brachial Plexus', 'Carpal Tunnel', 'Cranial Nerves']
}, {
  id: 2,
  name: 'Physiology',
  emoji: '💓',
  pct: 58,
  topics: 22,
  done: 13,
  color: 'var(--aa-teal)',
  highYield: ['Cardiac Output', 'Action Potential', 'Renal Clearance']
}, {
  id: 3,
  name: 'Biochemistry',
  emoji: '🧬',
  pct: 45,
  topics: 20,
  done: 9,
  color: 'var(--aa-purple)',
  highYield: ['Enzyme Kinetics', 'TCA Cycle', 'DNA Replication']
}, {
  id: 4,
  name: 'Pathology',
  emoji: '🔬',
  pct: 31,
  topics: 25,
  done: 8,
  color: 'var(--aa-coral)',
  highYield: ['Cell Injury', 'Neoplasia', 'Inflammation']
}, {
  id: 5,
  name: 'Pharmacology',
  emoji: '💊',
  pct: 62,
  topics: 24,
  done: 15,
  color: 'var(--aa-amber)',
  highYield: ['Beta Blockers', 'ACE Inhibitors', 'Antibiotics']
}, {
  id: 6,
  name: 'Microbiology',
  emoji: '🦠',
  pct: 38,
  topics: 19,
  done: 7,
  color: 'var(--aa-green)',
  highYield: ['Bacterial Virulence', 'Antibiotic Resistance', 'Immunology']
}, {
  id: 7,
  name: 'Forensic Medicine',
  emoji: '⚖️',
  pct: 55,
  topics: 14,
  done: 8,
  color: 'var(--aa-teal)',
  highYield: ['TOD Estimation', 'Wound Analysis', 'Medico-Legal']
}, {
  id: 8,
  name: 'Community Medicine',
  emoji: '🏥',
  pct: 40,
  topics: 18,
  done: 7,
  color: 'var(--aa-green)',
  highYield: ['Epidemiology', 'National Programs', 'Biostatistics']
}, {
  id: 9,
  name: 'ENT',
  emoji: '👂',
  pct: 66,
  topics: 12,
  done: 8,
  color: 'var(--aa-amber)',
  highYield: ['Ear Anatomy', 'Vertigo', 'Sinusitis']
}, {
  id: 10,
  name: 'Ophthalmology',
  emoji: '👁️',
  pct: 71,
  topics: 13,
  done: 9,
  color: 'var(--aa-teal)',
  highYield: ['Glaucoma', 'Retina', 'Corneal Disorders']
}, {
  id: 11,
  name: 'Medicine',
  emoji: '🩺',
  pct: 48,
  topics: 30,
  done: 14,
  color: 'var(--aa-coral)',
  highYield: ['Cardiology', 'Respiratory', 'Nephrology']
}, {
  id: 12,
  name: 'Surgery',
  emoji: '🔪',
  pct: 35,
  topics: 28,
  done: 10,
  color: 'var(--aa-purple)',
  highYield: ['GI Surgery', 'Trauma', 'Surgical Anatomy']
}];
const TOPIC_STATUSES = ['completed', 'in-progress', 'not-started', 'not-started', 'in-progress', 'completed', 'not-started', 'completed', 'in-progress', 'not-started'];
const TOPIC_NAMES_BY_SUBJECT = {
  1: ['Thorax & Mediastinum', 'Upper Limb', 'Lower Limb', 'Head & Neck', 'Neuroanatomy', 'Abdomen', 'Perineum', 'Back', 'Histology Basics', 'Embryology'],
  2: ['Cardiac Physiology', 'Respiratory Physiology', 'Renal Physiology', 'GI Physiology', 'Endocrinology', 'Neurophysiology', 'Blood & Immunity', 'Muscle Physiology', 'Reproductive', 'Special Senses'],
  3: ['Carbohydrate Metabolism', 'Lipid Metabolism', 'Protein Metabolism', 'Nucleic Acids', 'Enzymology', 'Vitamins', 'Minerals', 'Hormones', 'Molecular Biology', 'Clinical Biochemistry'],
  4: ['Cell Injury & Death', 'Inflammation', 'Repair & Regeneration', 'Neoplasia', 'Cardiovascular Pathology', 'Respiratory Pathology', 'GI Pathology', 'Renal Pathology', 'Hematology', 'Neuropathology'],
  5: ['Autonomic Pharmacology', 'Cardiovascular Drugs', 'CNS Drugs', 'Antibiotics', 'Antifungals', 'Antivirals', 'GI Pharmacology', 'Respiratory Drugs', 'Chemotherapy', 'Endocrine Pharmacology'],
  default: ['Topic 1', 'Topic 2', 'Topic 3', 'Topic 4', 'Topic 5', 'Topic 6', 'Topic 7', 'Topic 8', 'Topic 9', 'Topic 10']
};
const CircleProgress = ({
  pct,
  color,
  size = 64
}) => {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - pct / 100 * c;
  return /*#__PURE__*/React.createElement("svg", {
    width: size,
    height: size,
    style: {
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("circle", {
    cx: size / 2,
    cy: size / 2,
    r: r,
    fill: "none",
    stroke: "var(--aa-s3)",
    strokeWidth: "4.5"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: size / 2,
    cy: size / 2,
    r: r,
    fill: "none",
    strokeWidth: "4.5",
    stroke: color,
    strokeLinecap: "round",
    strokeDasharray: c,
    strokeDashoffset: offset,
    style: {
      transform: 'rotate(-90deg)',
      transformOrigin: 'center',
      transition: 'stroke-dashoffset 1s ease-out'
    }
  }), /*#__PURE__*/React.createElement("text", {
    x: size / 2,
    y: size / 2,
    textAnchor: "middle",
    dominantBaseline: "central",
    fill: color,
    fontSize: size * 0.2,
    fontFamily: "var(--aa-fd)",
    fontWeight: "700"
  }, pct, "%"));
};
const statusIcon = s => {
  if (s === 'completed') return /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--aa-green)',
      fontSize: 14
    }
  }, "\u2713");
  if (s === 'in-progress') return /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--aa-amber)',
      fontSize: 11
    }
  }, "\u25D0");
  return /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--aa-text-3)',
      fontSize: 11
    }
  }, "\u25CB");
};
const statusColor = s => s === 'completed' ? 'var(--aa-green)' : s === 'in-progress' ? 'var(--aa-amber)' : 'var(--aa-text-3)';
const SubjectPanel = ({
  subject,
  onClose,
  onNav
}) => {
  const topics = TOPIC_NAMES_BY_SUBJECT[subject.id] || TOPIC_NAMES_BY_SUBJECT.default;
  const statuses = TOPIC_STATUSES;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      right: 0,
      top: 0,
      bottom: 0,
      width: 380,
      zIndex: 80,
      background: 'var(--aa-s2)',
      borderLeft: '1px solid var(--aa-border)',
      display: 'flex',
      flexDirection: 'column',
      animation: 'aaSlideR 0.3s ease-out',
      boxShadow: '-8px 0 40px rgba(0,0,0,0.4)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '22px 24px 18px',
      borderBottom: '1px solid var(--aa-border)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 24
    }
  }, subject.emoji), /*#__PURE__*/React.createElement("span", {
    className: "aa-h3"
  }, subject.name)), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'var(--aa-text-2)',
      padding: 4,
      borderRadius: 'var(--aa-r-sm)',
      transition: 'background 0.15s',
      display: 'flex',
      alignItems: 'center'
    },
    onMouseEnter: e => e.currentTarget.style.background = 'var(--aa-s3)',
    onMouseLeave: e => e.currentTarget.style.background = 'none'
  }, /*#__PURE__*/React.createElement(Icons.close, null))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement(CircleProgress, {
    pct: subject.pct,
    color: subject.color,
    size: 56
  }), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 6,
      flexWrap: 'wrap'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "aa-badge aa-badge-green",
    style: {
      fontSize: '0.65rem'
    }
  }, subject.done, " completed"), /*#__PURE__*/React.createElement("span", {
    className: "aa-badge aa-badge-amber",
    style: {
      fontSize: '0.65rem'
    }
  }, subject.topics - subject.done, " remaining")), /*#__PURE__*/React.createElement("div", {
    className: "aa-caption",
    style: {
      marginTop: 6
    }
  }, subject.topics, " total topics"))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 14
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "aa-label",
    style: {
      color: 'var(--aa-coral)',
      fontSize: '0.62rem',
      marginBottom: 6
    }
  }, "\uD83C\uDFAF High Yield Topics"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 5
    }
  }, subject.highYield.map(t => /*#__PURE__*/React.createElement("span", {
    key: t,
    className: "aa-badge aa-badge-coral",
    style: {
      fontSize: '0.68rem'
    }
  }, t))))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '16px 16px'
    },
    className: "no-scroll"
  }, /*#__PURE__*/React.createElement("div", {
    className: "aa-label",
    style: {
      color: 'var(--aa-text-3)',
      marginBottom: 10,
      paddingLeft: 4,
      fontSize: '0.63rem'
    }
  }, "All Topics"), topics.map((topic, i) => {
    const st = statuses[i % statuses.length];
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        borderRadius: 'var(--aa-r)',
        marginBottom: 4,
        cursor: 'pointer',
        transition: 'background 0.15s',
        background: 'transparent',
        border: '1px solid transparent'
      },
      onMouseEnter: e => {
        e.currentTarget.style.background = 'var(--aa-s3)';
        e.currentTarget.style.borderColor = 'var(--aa-border)';
      },
      onMouseLeave: e => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.borderColor = 'transparent';
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        width: 24,
        flexShrink: 0,
        textAlign: 'center'
      }
    }, statusIcon(st)), /*#__PURE__*/React.createElement("span", {
      className: "aa-body-sm",
      style: {
        flex: 1,
        color: st === 'completed' ? 'var(--aa-text-2)' : 'var(--aa-text-1)',
        textDecoration: st === 'completed' ? 'none' : 'none'
      }
    }, topic), subject.highYield.some(h => topic.includes(h.split(' ')[0])) && /*#__PURE__*/React.createElement("span", {
      className: "aa-badge aa-badge-coral",
      style: {
        fontSize: '0.58rem'
      }
    }, "HY"), /*#__PURE__*/React.createElement("span", {
      style: {
        color: 'var(--aa-text-3)',
        flexShrink: 0
      }
    }, /*#__PURE__*/React.createElement(Icons.chevronRight, null)));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '14px 16px',
      borderTop: '1px solid var(--aa-border)',
      display: 'flex',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "aa-btn aa-btn-primary aa-btn-sm",
    style: {
      flex: 1
    },
    onClick: () => onNav('tutor')
  }, /*#__PURE__*/React.createElement(Icons.brain, null), " Study with AI"), /*#__PURE__*/React.createElement("button", {
    className: "aa-btn aa-btn-secondary aa-btn-sm",
    style: {
      flex: 1
    },
    onClick: () => onNav('practice')
  }, /*#__PURE__*/React.createElement(Icons.clipboard, null), " Practice MCQs")));
};
const Syllabus = ({
  onNav
}) => {
  const [selected, setSelected] = React.useState(null);
  const [filter, setFilter] = React.useState('all');
  const filtered = SUBJECTS_DATA.filter(s => {
    if (filter === 'low') return s.pct < 40;
    if (filter === 'mid') return s.pct >= 40 && s.pct < 70;
    if (filter === 'high') return s.pct >= 70;
    return true;
  });
  const totalTopics = SUBJECTS_DATA.reduce((a, s) => a + s.topics, 0);
  const doneTopics = SUBJECTS_DATA.reduce((a, s) => a + s.done, 0);
  const overallPct = Math.round(doneTopics / totalTopics * 100);
  return /*#__PURE__*/React.createElement("div", {
    className: "aa-page aa-anim-fade-up"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 24
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "aa-h1",
    style: {
      marginBottom: 6
    }
  }, "Syllabus Map"), /*#__PURE__*/React.createElement("div", {
    className: "aa-body",
    style: {
      color: 'var(--aa-text-2)'
    }
  }, "Your visual curriculum tracker \u2014 light up every topic")), /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'linear-gradient(135deg, #0f1e38 0%, #0a1224 100%)',
      border: '1px solid var(--aa-teal-border)',
      borderRadius: 'var(--aa-r-xl)',
      padding: '24px 28px',
      marginBottom: 24,
      display: 'flex',
      alignItems: 'center',
      gap: 24
    }
  }, /*#__PURE__*/React.createElement(CircleProgress, {
    pct: overallPct,
    color: "var(--aa-teal)",
    size: 88
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "aa-h2",
    style: {
      marginBottom: 4
    }
  }, "Overall Progress"), /*#__PURE__*/React.createElement("div", {
    className: "aa-body",
    style: {
      color: 'var(--aa-text-2)',
      marginBottom: 12
    }
  }, doneTopics, " of ", totalTopics, " topics completed across ", SUBJECTS_DATA.length, " subjects"), /*#__PURE__*/React.createElement("div", {
    className: "aa-prog-track",
    style: {
      height: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "aa-prog-fill aa-prog-fill-teal",
    style: {
      width: `${overallPct}%`
    }
  }))), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--aa-fd)',
      fontSize: '2rem',
      fontWeight: 700,
      color: 'var(--aa-teal)'
    }
  }, overallPct, "%"), /*#__PURE__*/React.createElement("div", {
    className: "aa-caption"
  }, "Complete"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginBottom: 20
    }
  }, [{
    id: 'all',
    label: 'All Subjects'
  }, {
    id: 'low',
    label: 'Needs Work <40%'
  }, {
    id: 'mid',
    label: 'In Progress'
  }, {
    id: 'high',
    label: 'Strong >70%'
  }].map(f => /*#__PURE__*/React.createElement("button", {
    key: f.id,
    className: `aa-pill ${filter === f.id ? 'active' : ''}`,
    onClick: () => setFilter(f.id),
    style: {
      fontSize: '0.78rem'
    }
  }, f.label))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(3,1fr)',
      gap: 14,
      marginRight: selected ? 400 : 0,
      transition: 'margin-right 0.3s'
    }
  }, filtered.map(s => /*#__PURE__*/React.createElement("div", {
    key: s.id,
    onClick: () => setSelected(selected?.id === s.id ? null : s),
    style: {
      padding: '20px',
      borderRadius: 'var(--aa-r-lg)',
      background: selected?.id === s.id ? s.color + '10' : 'var(--aa-s2)',
      border: `1px solid ${selected?.id === s.id ? s.color + '50' : 'var(--aa-border)'}`,
      cursor: 'pointer',
      transition: 'all 0.2s',
      boxShadow: selected?.id === s.id ? `0 0 24px ${s.color}20` : 'none'
    },
    onMouseEnter: e => {
      if (selected?.id !== s.id) {
        e.currentTarget.style.borderColor = s.color + '40';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }
    },
    onMouseLeave: e => {
      if (selected?.id !== s.id) {
        e.currentTarget.style.borderColor = 'var(--aa-border)';
        e.currentTarget.style.transform = '';
      }
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: 20
    }
  }, s.emoji), /*#__PURE__*/React.createElement("span", {
    className: "aa-h4",
    style: {
      fontSize: '0.9rem'
    }
  }, s.name)), /*#__PURE__*/React.createElement(CircleProgress, {
    pct: s.pct,
    color: s.color,
    size: 44
  })), /*#__PURE__*/React.createElement("div", {
    className: "aa-prog-track",
    style: {
      height: 4,
      marginBottom: 8
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "aa-prog-fill",
    style: {
      width: `${s.pct}%`,
      background: s.color,
      boxShadow: `0 0 6px ${s.color}40`
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "aa-caption",
    style: {
      fontSize: '0.7rem'
    }
  }, s.done, "/", s.topics, " topics"), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 4
    }
  }, s.highYield.slice(0, 1).map(h => /*#__PURE__*/React.createElement("span", {
    key: h,
    className: "aa-badge aa-badge-coral",
    style: {
      fontSize: '0.58rem'
    }
  }, "HY")), s.pct >= 70 && /*#__PURE__*/React.createElement("span", {
    className: "aa-badge aa-badge-green",
    style: {
      fontSize: '0.58rem'
    }
  }, "Strong"), s.pct < 40 && /*#__PURE__*/React.createElement("span", {
    className: "aa-badge aa-badge-coral",
    style: {
      fontSize: '0.58rem'
    }
  }, "Review")))))), selected && /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      inset: 0,
      background: 'rgba(4,7,14,0.3)',
      zIndex: 79
    },
    onClick: () => setSelected(null)
  }), /*#__PURE__*/React.createElement(SubjectPanel, {
    subject: selected,
    onClose: () => setSelected(null),
    onNav: onNav
  })));
};
Object.assign(window, {
  Syllabus
});

// AlmondAI — Crisis Mode Page

const CRISIS_PLAN = {
  exam: 'NEET-PG 2025',
  daysLeft: 3,
  days: [{
    day: 1,
    label: 'Day 1 — High Yield Core',
    hours: [{
      time: '8–10 AM',
      topic: 'Pharmacology: Autonomic drugs + CVS drugs',
      subject: 'Pharmacology',
      done: true,
      highYield: true
    }, {
      time: '10–12 PM',
      topic: 'Pathology: Cell injury, Inflammation, Neoplasia',
      subject: 'Pathology',
      done: true,
      highYield: true
    }, {
      time: '1–3 PM',
      topic: 'Physiology: Cardiac Output + ECG',
      subject: 'Physiology',
      done: true,
      highYield: true
    }, {
      time: '3–5 PM',
      topic: 'Anatomy: Brachial plexus + Cranial nerves',
      subject: 'Anatomy',
      done: false,
      highYield: true
    }, {
      time: '5–6 PM',
      topic: 'Quick revision: Biochemistry enzymes',
      subject: 'Biochemistry',
      done: false,
      highYield: false
    }, {
      time: '7–9 PM',
      topic: 'Microbiology: Bacterial infections + Antibiotics',
      subject: 'Microbiology',
      done: false,
      highYield: true
    }, {
      time: '9–10 PM',
      topic: 'MCQ Practice: Mixed 50 questions',
      subject: 'Practice',
      done: false,
      highYield: false
    }]
  }, {
    day: 2,
    label: 'Day 2 — Clinical Sciences',
    hours: [{
      time: '8–10 AM',
      topic: 'Medicine: Cardiology + Respiratory',
      subject: 'Medicine',
      done: false,
      highYield: true
    }, {
      time: '10–12 PM',
      topic: 'Surgery: GI + Hepatobiliary',
      subject: 'Surgery',
      done: false,
      highYield: true
    }, {
      time: '1–3 PM',
      topic: 'Obs & Gynae: Antepartum + Labour',
      subject: 'Obs & Gynae',
      done: false,
      highYield: true
    }, {
      time: '3–5 PM',
      topic: 'Paediatrics: Developmental milestones + NNJ',
      subject: 'Paediatrics',
      done: false,
      highYield: true
    }, {
      time: '5–7 PM',
      topic: 'ENT + Ophthalmology high-yield combined',
      subject: 'ENT/Ophtho',
      done: false,
      highYield: true
    }, {
      time: '8–10 PM',
      topic: 'Grand revision MCQs: 100 questions',
      subject: 'Practice',
      done: false,
      highYield: false
    }]
  }, {
    day: 3,
    label: 'Day 3 — Final Sprint',
    hours: [{
      time: '8–10 AM',
      topic: 'Community Medicine: Biostatistics + Screening',
      subject: 'PSM',
      done: false,
      highYield: true
    }, {
      time: '10–12 PM',
      topic: 'Forensic Medicine: TOD + Wounds + Poisons',
      subject: 'FMT',
      done: false,
      highYield: true
    }, {
      time: '1–3 PM',
      topic: 'Rapid revision: All subjects 1-liners',
      subject: 'All',
      done: false,
      highYield: false
    }, {
      time: '3–5 PM',
      topic: 'Mock test: 200 question full paper',
      subject: 'Practice',
      done: false,
      highYield: false
    }, {
      time: '6 PM+',
      topic: 'Rest, hydrate, sleep early',
      subject: 'Wellness',
      done: false,
      highYield: false
    }]
  }]
};
const subjectColors = {
  'Pharmacology': 'var(--aa-amber)',
  'Pathology': 'var(--aa-coral)',
  'Physiology': 'var(--aa-teal)',
  'Anatomy': 'var(--aa-purple)',
  'Biochemistry': 'var(--aa-green)',
  'Microbiology': '#60a5fa',
  'Medicine': 'var(--aa-amber)',
  'Surgery': 'var(--aa-coral)',
  'Obs & Gynae': 'var(--aa-purple)',
  'Paediatrics': 'var(--aa-teal)',
  'ENT/Ophtho': 'var(--aa-green)',
  'PSM': 'var(--aa-teal)',
  'FMT': 'var(--aa-amber)',
  'All': 'var(--aa-text-2)',
  'Practice': 'var(--aa-teal)',
  'Wellness': 'var(--aa-green)'
};
const TeachModal = ({
  topic,
  onClose
}) => {
  const [loading, setLoading] = React.useState(true);
  const [content, setContent] = React.useState('');
  React.useEffect(() => {
    setLoading(true);
    window.claude.complete({
      messages: [{
        role: 'user',
        content: `Give me a rapid exam-focused summary of "${topic}" for NEET-PG. Use bullet points, bold key terms, and include 2-3 must-know facts. Keep it under 200 words.`
      }]
    }).then(r => {
      setContent(r);
      setLoading(false);
    }).catch(() => {
      setContent('Could not load content. Please try again.');
      setLoading(false);
    });
  }, [topic]);
  const formatContent = text => text.split('\n').map((line, i) => {
    let html = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>');
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      dangerouslySetInnerHTML: {
        __html: html
      },
      style: {
        marginBottom: line === '' ? 8 : 3,
        lineHeight: 1.65
      }
    });
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "aa-overlay",
    onClick: onClose
  }, /*#__PURE__*/React.createElement("div", {
    className: "aa-modal",
    style: {
      maxWidth: 520
    },
    onClick: e => e.stopPropagation()
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
    className: "aa-badge aa-badge-coral",
    style: {
      marginBottom: 8
    }
  }, "\uD83D\uDEA8 Crisis Teach"), /*#__PURE__*/React.createElement("div", {
    className: "aa-h3",
    style: {
      lineHeight: 1.3
    }
  }, topic)), /*#__PURE__*/React.createElement("button", {
    onClick: onClose,
    style: {
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: 'var(--aa-text-2)',
      padding: 4,
      flexShrink: 0,
      marginTop: -2
    }
  }, /*#__PURE__*/React.createElement(Icons.close, null))), /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '18px',
      background: 'var(--aa-s1)',
      borderRadius: 'var(--aa-r-lg)',
      border: '1px solid var(--aa-border)',
      minHeight: 160,
      maxHeight: 360,
      overflowY: 'auto'
    },
    className: "no-scroll"
  }, loading ? /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10
    }
  }, [100, 85, 90, 70, 95].map((w, i) => /*#__PURE__*/React.createElement("div", {
    key: i,
    style: {
      height: 14,
      borderRadius: 6,
      background: 'var(--aa-s3)',
      width: `${w}%`,
      animation: `aaPulse 1.5s ${i * 0.1}s ease-in-out infinite`
    }
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      marginTop: 8,
      color: 'var(--aa-teal)',
      fontSize: '0.78rem',
      fontFamily: 'var(--aa-fd)',
      display: 'flex',
      alignItems: 'center',
      gap: 6
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      width: 12,
      height: 12,
      border: '2px solid var(--aa-teal)',
      borderTopColor: 'transparent',
      borderRadius: '50%',
      animation: 'aaSpinSlow 0.7s linear infinite'
    }
  }), "AlmondAI is compiling crisis notes\u2026")) : /*#__PURE__*/React.createElement("div", {
    className: "aa-body-sm",
    style: {
      lineHeight: 1.7
    }
  }, formatContent(content))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 8,
      marginTop: 16
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "aa-btn aa-btn-primary aa-btn-sm",
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement(Icons.clipboard, null), " Practice MCQs on this"), /*#__PURE__*/React.createElement("button", {
    className: "aa-btn aa-btn-ghost aa-btn-sm",
    onClick: onClose
  }, "Close"))));
};
const Crisis = ({
  onNav
}) => {
  const [activeDay, setActiveDay] = React.useState(1);
  const [checked, setChecked] = React.useState({
    0: true,
    1: true,
    2: true
  });
  const [teachTopic, setTeachTopic] = React.useState(null);
  const [activated, setActivated] = React.useState(true);
  const currentDayData = CRISIS_PLAN.days.find(d => d.day === activeDay);
  const doneCount = Object.values(checked).filter(Boolean).length;
  const totalToday = currentDayData?.hours.length || 0;
  const progressPct = totalToday > 0 ? Math.round(doneCount / totalToday * 100) : 0;
  const toggle = i => setChecked(c => ({
    ...c,
    [i]: !c[i]
  }));
  if (!activated) return /*#__PURE__*/React.createElement("div", {
    className: "aa-page aa-anim-fade-up"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxWidth: 540
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      padding: '32px',
      background: 'rgba(255,107,91,0.05)',
      border: '1px solid var(--aa-coral-border)',
      borderRadius: 'var(--aa-r-xl)',
      textAlign: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '3rem',
      marginBottom: 16
    }
  }, "\uD83D\uDEA8"), /*#__PURE__*/React.createElement("div", {
    className: "aa-h2",
    style: {
      marginBottom: 8
    }
  }, "Activate Crisis Mode"), /*#__PURE__*/React.createElement("div", {
    className: "aa-body",
    style: {
      color: 'var(--aa-text-2)',
      marginBottom: 24,
      maxWidth: 380,
      margin: '0 auto 24px'
    }
  }, "Crisis Mode generates an AI-powered hour-by-hour exam rescue plan. Use when exam is in 1\u20137 days."), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      marginBottom: 24
    }
  }, ['NEET-PG 2025', 'MBBS Finals', 'FMGE', 'Internal Assessment'].map(exam => /*#__PURE__*/React.createElement("button", {
    key: exam,
    className: "aa-pill",
    style: {
      justifyContent: 'center',
      padding: '10px'
    }
  }, exam))), /*#__PURE__*/React.createElement("button", {
    className: "aa-btn aa-btn-danger",
    style: {
      width: '100%',
      padding: '13px'
    },
    onClick: () => setActivated(true)
  }, /*#__PURE__*/React.createElement(Icons.alert, null), " Activate Crisis Mode \u2014 1 Free Use"))));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'radial-gradient(ellipse at 50% 0%, rgba(255,107,91,0.06) 0%, var(--aa-bg) 55%)',
      minHeight: '100vh'
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "aa-page aa-anim-fade-up"
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      background: 'rgba(255,107,91,0.08)',
      border: '1px solid var(--aa-coral-border)',
      borderRadius: 'var(--aa-r-xl)',
      padding: '22px 28px',
      marginBottom: 24,
      display: 'flex',
      alignItems: 'center',
      gap: 20,
      position: 'relative',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: -30,
      right: -30,
      width: 120,
      height: 120,
      background: 'radial-gradient(circle, rgba(255,107,91,0.12) 0%, transparent 70%)'
    }
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '2.8rem',
      animation: 'aaFlicker 1.5s ease-in-out infinite',
      flexShrink: 0
    }
  }, "\uD83D\uDEA8"), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      marginBottom: 6
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "aa-badge aa-badge-coral"
  }, "CRISIS MODE ACTIVE"), /*#__PURE__*/React.createElement("span", {
    className: "aa-badge",
    style: {
      background: 'rgba(255,107,91,0.15)',
      color: 'var(--aa-coral)',
      border: '1px solid var(--aa-coral-border)'
    }
  }, CRISIS_PLAN.daysLeft, " days to ", CRISIS_PLAN.exam)), /*#__PURE__*/React.createElement("div", {
    className: "aa-h2",
    style: {
      color: 'var(--aa-text-1)',
      marginBottom: 4
    }
  }, CRISIS_PLAN.exam, " \u2014 Emergency Plan"), /*#__PURE__*/React.createElement("div", {
    className: "aa-body-sm",
    style: {
      color: 'var(--aa-text-2)'
    }
  }, "AI-generated 3-day rescue plan \xB7 Stay focused, execute the mission")), /*#__PURE__*/React.createElement("div", {
    style: {
      textAlign: 'right',
      flexShrink: 0
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--aa-fd)',
      fontSize: '3rem',
      fontWeight: 800,
      color: 'var(--aa-coral)',
      lineHeight: 1,
      animation: 'aaStreakGlow 2s ease-in-out infinite',
      filter: 'drop-shadow(0 0 12px rgba(255,107,91,0.5))'
    }
  }, CRISIS_PLAN.daysLeft), /*#__PURE__*/React.createElement("div", {
    className: "aa-label",
    style: {
      color: 'var(--aa-text-3)',
      fontSize: '0.62rem'
    }
  }, "DAYS LEFT"))), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10,
      marginBottom: 20
    }
  }, CRISIS_PLAN.days.map(d => /*#__PURE__*/React.createElement("button", {
    key: d.day,
    onClick: () => {
      setActiveDay(d.day);
      setChecked({});
    },
    style: {
      flex: 1,
      padding: '12px 16px',
      borderRadius: 'var(--aa-r-md)',
      border: '1px solid',
      borderColor: activeDay === d.day ? 'var(--aa-coral-border)' : 'var(--aa-border)',
      background: activeDay === d.day ? 'var(--aa-coral-bg)' : 'var(--aa-s2)',
      color: activeDay === d.day ? 'var(--aa-coral)' : 'var(--aa-text-2)',
      fontFamily: 'var(--aa-fb)',
      fontWeight: 600,
      fontSize: '0.875rem',
      cursor: 'pointer',
      transition: 'all 0.18s'
    }
  }, /*#__PURE__*/React.createElement("div", null, "Day ", d.day), /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: '0.72rem',
      fontWeight: 400,
      marginTop: 2,
      opacity: 0.75
    }
  }, d.hours.length, " sessions")))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginBottom: 18
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "aa-flex-between",
    style: {
      marginBottom: 10
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "aa-h3"
  }, currentDayData.label), /*#__PURE__*/React.createElement("span", {
    className: "aa-badge aa-badge-coral"
  }, doneCount, "/", totalToday, " done")), /*#__PURE__*/React.createElement("div", {
    className: "aa-prog-track",
    style: {
      height: 7
    }
  }, /*#__PURE__*/React.createElement("div", {
    className: "aa-prog-fill",
    style: {
      width: `${progressPct}%`,
      background: `linear-gradient(90deg, var(--aa-coral), #ff9580)`,
      boxShadow: '0 0 10px rgba(255,107,91,0.4)'
    }
  })), /*#__PURE__*/React.createElement("div", {
    className: "aa-caption",
    style: {
      marginTop: 5,
      color: 'var(--aa-coral)'
    }
  }, progressPct, "% of today's mission complete", progressPct === 100 && ' 🎉 Day complete!')), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      marginBottom: 24
    }
  }, currentDayData.hours.map((block, i) => {
    const isDone = checked[i];
    const subColor = subjectColors[block.subject] || 'var(--aa-text-2)';
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      style: {
        display: 'flex',
        alignItems: 'flex-start',
        gap: 14,
        padding: '16px 18px',
        borderRadius: 'var(--aa-r-md)',
        background: isDone ? 'rgba(53,232,166,0.04)' : 'var(--aa-s2)',
        border: `1px solid ${isDone ? 'var(--aa-green-border)' : 'var(--aa-border)'}`,
        transition: 'all 0.2s',
        opacity: isDone ? 0.7 : 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      onClick: () => toggle(i),
      style: {
        width: 22,
        height: 22,
        borderRadius: 6,
        border: `2px solid ${isDone ? 'var(--aa-green)' : 'var(--aa-border)'}`,
        background: isDone ? 'var(--aa-green)' : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        flexShrink: 0,
        marginTop: 1,
        transition: 'all 0.2s'
      }
    }, isDone && /*#__PURE__*/React.createElement("span", {
      style: {
        color: '#06090f',
        fontSize: 13,
        fontWeight: 700
      }
    }, "\u2713")), /*#__PURE__*/React.createElement("div", {
      style: {
        width: 3,
        alignSelf: 'stretch',
        borderRadius: 2,
        background: subColor,
        flexShrink: 0,
        opacity: 0.7
      }
    }), /*#__PURE__*/React.createElement("div", {
      style: {
        flex: 1
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "aa-label",
      style: {
        color: 'var(--aa-text-3)',
        fontSize: '0.62rem'
      }
    }, block.time), /*#__PURE__*/React.createElement("span", {
      className: "aa-badge",
      style: {
        fontSize: '0.6rem',
        background: `${subColor}15`,
        color: subColor,
        border: `1px solid ${subColor}40`
      }
    }, block.subject), block.highYield && /*#__PURE__*/React.createElement("span", {
      className: "aa-badge aa-badge-coral",
      style: {
        fontSize: '0.58rem'
      }
    }, "HY")), /*#__PURE__*/React.createElement("div", {
      className: "aa-body-sm",
      style: {
        color: isDone ? 'var(--aa-text-3)' : 'var(--aa-text-1)',
        textDecoration: isDone ? 'line-through' : 'none',
        fontWeight: isDone ? 400 : 500
      }
    }, block.topic)), !isDone && block.subject !== 'Practice' && block.subject !== 'Wellness' && /*#__PURE__*/React.createElement("button", {
      className: "aa-btn aa-btn-ghost aa-btn-xs",
      style: {
        flexShrink: 0
      },
      onClick: () => setTeachTopic(block.topic)
    }, /*#__PURE__*/React.createElement(Icons.sparkles, null), " Teach me"));
  })), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      gap: 10
    }
  }, /*#__PURE__*/React.createElement("button", {
    className: "aa-btn aa-btn-danger",
    style: {
      flex: 1,
      padding: '12px'
    },
    onClick: () => onNav('practice')
  }, /*#__PURE__*/React.createElement(Icons.clipboard, null), " Practice MCQs Now"), /*#__PURE__*/React.createElement("button", {
    className: "aa-btn aa-btn-secondary",
    onClick: () => onNav('tutor')
  }, /*#__PURE__*/React.createElement(Icons.brain, null), " Ask AI Tutor"))), teachTopic && /*#__PURE__*/React.createElement(TeachModal, {
    topic: teachTopic,
    onClose: () => setTeachTopic(null)
  }));
};
Object.assign(window, {
  Crisis
});

// AlmondAI — Main App Component

const USER = {
  name: 'Arjun Sharma',
  college: 'AIIMS New Delhi',
  streak: 14,
  xp: 2340,
  maxXp: 3000,
  level: 8,
  almonds: 4,
  isPremium: false
};
const PAGES = {
  dashboard: Dashboard,
  tutor: Tutor,
  practice: Practice,
  syllabus: Syllabus,
  crisis: Crisis
};

// Placeholder for unbuilt pages
const PlaceholderPage = ({
  name
}) => /*#__PURE__*/React.createElement("div", {
  className: "aa-page aa-anim-fade-up"
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '50vh',
    textAlign: 'center',
    gap: 16
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 80,
    height: 80,
    borderRadius: 'var(--aa-r-xl)',
    background: 'var(--aa-s2)',
    border: '1px solid var(--aa-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 32
  }
}, "\uD83D\uDEA7"), /*#__PURE__*/React.createElement("div", {
  className: "aa-h2"
}, name), /*#__PURE__*/React.createElement("div", {
  className: "aa-body",
  style: {
    color: 'var(--aa-text-2)',
    maxWidth: 300
  }
}, "This page is part of the AlmondAI system. Navigate to Dashboard, AI Tutor, Practice, Syllabus, or Crisis Mode to see the full redesign.")));

// Toast system
const Toast = ({
  msg,
  type,
  onDone
}) => {
  React.useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, []);
  const icons = {
    success: '✓',
    info: '◈',
    amber: '⚡'
  };
  return /*#__PURE__*/React.createElement("div", {
    className: `aa-toast aa-toast-${type}`
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 700,
      fontSize: '1rem'
    }
  }, icons[type] || '●'), msg);
};

// Tweaks panel
const TweaksPanel = ({
  tweaks,
  onTweak
}) => /*#__PURE__*/React.createElement("div", {
  id: "aa-tweaks",
  className: "visible"
}, /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16
  }
}, /*#__PURE__*/React.createElement("div", {
  className: "aa-h4"
}, "Tweaks"), /*#__PURE__*/React.createElement("span", {
  className: "aa-badge aa-badge-teal"
}, "Live")), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14
  }
}, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  className: "aa-label",
  style: {
    color: 'var(--aa-text-3)',
    marginBottom: 8,
    fontSize: '0.62rem'
  }
}, "Accent Color"), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 6
  }
}, [{
  label: 'Amber',
  val: 'amber',
  color: '#f5a623'
}, {
  label: 'Teal',
  val: 'teal',
  color: '#0fd4c0'
}, {
  label: 'Purple',
  val: 'purple',
  color: '#9d78ff'
}].map(a => /*#__PURE__*/React.createElement("button", {
  key: a.val,
  onClick: () => onTweak('accent', a.val),
  style: {
    flex: 1,
    padding: '6px 4px',
    borderRadius: 'var(--aa-r)',
    border: '1px solid',
    borderColor: tweaks.accent === a.val ? a.color + '60' : 'var(--aa-border)',
    background: tweaks.accent === a.val ? a.color + '15' : 'var(--aa-s1)',
    color: tweaks.accent === a.val ? a.color : 'var(--aa-text-2)',
    fontFamily: 'var(--aa-fb)',
    fontSize: '0.72rem',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.18s'
  }
}, /*#__PURE__*/React.createElement("div", {
  style: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: a.color,
    margin: '0 auto 3px'
  }
}), a.label)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  className: "aa-label",
  style: {
    color: 'var(--aa-text-3)',
    marginBottom: 8,
    fontSize: '0.62rem'
  }
}, "Density"), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 6
  }
}, ['Compact', 'Default', 'Spacious'].map(d => /*#__PURE__*/React.createElement("button", {
  key: d,
  onClick: () => onTweak('density', d.toLowerCase()),
  className: `aa-pill ${tweaks.density === d.toLowerCase() ? 'active' : ''}`,
  style: {
    flex: 1,
    justifyContent: 'center',
    fontSize: '0.72rem'
  }
}, d)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  className: "aa-label",
  style: {
    color: 'var(--aa-text-3)',
    marginBottom: 8,
    fontSize: '0.62rem'
  }
}, "Sidebar Style"), /*#__PURE__*/React.createElement("div", {
  style: {
    display: 'flex',
    gap: 6
  }
}, ['Icons + Labels', 'Icons Only'].map(s => /*#__PURE__*/React.createElement("button", {
  key: s,
  onClick: () => onTweak('sidebar', s),
  className: `aa-pill ${tweaks.sidebar === s ? 'active' : ''}`,
  style: {
    flex: 1,
    justifyContent: 'center',
    fontSize: '0.7rem'
  }
}, s)))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  className: "aa-label",
  style: {
    color: 'var(--aa-text-3)',
    marginBottom: 8,
    fontSize: '0.62rem'
  }
}, "XP Demo (", tweaks.xp, "%)"), /*#__PURE__*/React.createElement("input", {
  type: "range",
  min: "0",
  max: "100",
  value: tweaks.xp,
  onChange: e => onTweak('xp', +e.target.value),
  style: {
    width: '100%',
    accentColor: 'var(--aa-teal)',
    cursor: 'pointer'
  }
})), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("div", {
  className: "aa-label",
  style: {
    color: 'var(--aa-text-3)',
    marginBottom: 8,
    fontSize: '0.62rem'
  }
}, "Streak Demo (", tweaks.streak, " days)"), /*#__PURE__*/React.createElement("input", {
  type: "range",
  min: "0",
  max: "100",
  value: tweaks.streak,
  onChange: e => onTweak('streak', +e.target.value),
  style: {
    width: '100%',
    accentColor: 'var(--aa-amber)',
    cursor: 'pointer'
  }
}))));
const App = () => {
  const saved = (() => {
    try {
      return localStorage.getItem('aa_page') || 'dashboard';
    } catch {
      return 'dashboard';
    }
  })();
  const [page, setPage] = React.useState(saved);
  const [toast, setToast] = React.useState(null);
  const [tweaksOpen, setTweaksOpen] = React.useState(false);
  const [tweaks, setTweaks] = React.useState({
    accent: 'amber',
    density: 'default',
    sidebar: 'Icons + Labels',
    xp: 78,
    streak: 14
  });
  const navigate = p => {
    setPage(p);
    try {
      localStorage.setItem('aa_page', p);
    } catch {}
    if (p !== page) {
      setToast({
        msg: `Navigating to ${p.charAt(0).toUpperCase() + p.slice(1)}`,
        type: 'info'
      });
    }
  };
  const handleTweak = (key, val) => {
    setTweaks(t => ({
      ...t,
      [key]: val
    }));
    if (key === 'accent') {
      const map = {
        amber: '#f5a623',
        teal: '#0fd4c0',
        purple: '#9d78ff'
      };
      document.documentElement.style.setProperty('--aa-amber', map[val]);
      document.documentElement.style.setProperty('--aa-amber-bg', map[val] + '12');
      document.documentElement.style.setProperty('--aa-amber-border', map[val] + '45');
      document.documentElement.style.setProperty('--aa-amber-glow', map[val] + '25');
    }
    if (key === 'density') {
      const pad = key === 'compact' ? '24px 32px' : key === 'spacious' ? '48px 56px' : '36px 44px';
      document.querySelectorAll('.aa-page').forEach(el => el.style.padding = pad);
    }
  };

  // Tweaks panel listener
  React.useEffect(() => {
    const handler = e => {
      if (e.data?.type === '__activate_edit_mode') setTweaksOpen(true);
      if (e.data?.type === '__deactivate_edit_mode') setTweaksOpen(false);
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({
      type: '__edit_mode_available'
    }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);
  const userWithTweaks = {
    ...USER,
    streak: tweaks.streak,
    xp: Math.round(tweaks.xp / 100 * 3000),
    maxXp: 3000,
    level: 8
  };
  const PageComp = PAGES[page];
  return /*#__PURE__*/React.createElement("div", {
    className: "aa-layout"
  }, /*#__PURE__*/React.createElement(Sidebar, {
    page: page,
    onNav: navigate,
    user: userWithTweaks
  }), /*#__PURE__*/React.createElement("main", {
    className: "aa-main"
  }, PageComp ? /*#__PURE__*/React.createElement(PageComp, {
    onNav: navigate,
    user: userWithTweaks
  }) : /*#__PURE__*/React.createElement(PlaceholderPage, {
    name: page.charAt(0).toUpperCase() + page.slice(1)
  })), toast && /*#__PURE__*/React.createElement(Toast, {
    msg: toast.msg,
    type: toast.type,
    onDone: () => setToast(null)
  }), tweaksOpen && /*#__PURE__*/React.createElement(TweaksPanel, {
    tweaks: tweaks,
    onTweak: handleTweak
  }));
};
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(/*#__PURE__*/React.createElement(App, null));