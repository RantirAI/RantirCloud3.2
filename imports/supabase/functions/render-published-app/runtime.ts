/**
 * Generate the runtime JavaScript code
 * This renders the app components based on the configuration
 */
export function generateRuntimeCode(): string {
return `
(function() {
  try {
  'use strict';
  
  const { createElement: h, useState, useEffect, Fragment } = React;
  const config = window.__RANTIR_APP_CONFIG__;
  
  // Find current page
  const currentPage = config.pages.find(p => p.id === config.currentPageId) || config.pages[0];
  
  // Build style class lookup map for fast resolution
  const styleClassMap = {};
  if (config.styleClasses && config.styleClasses.classes) {
    for (const cls of config.styleClasses.classes) {
      if (cls.name) {
        styleClassMap[cls.name] = cls;
      }
    }
  }
  
  // Component type mapping
  const componentRenderers = {
    div: renderDiv,
    container: renderDiv,
    text: renderText,
    heading: renderHeading,
    h1: renderHeading,
    h2: renderHeading,
    h3: renderHeading,
    h4: renderHeading,
    h5: renderHeading,
    h6: renderHeading,
    button: renderButton,
    image: renderImage,
    icon: renderIcon,
    input: renderInput,
    link: renderLink,
    form: renderForm,
    'form-wrapper': renderForm,
    section: renderSection,
    header: renderHeader,
    footer: renderFooter,
    nav: renderNav,
    'nav-horizontal': renderNav,
    'nav-vertical': renderNav,
    card: renderCard,
    list: renderList,
    video: renderVideo,
    spacer: renderSpacer,
    separator: renderSeparator,
    blockquote: renderBlockquote,
    paragraph: renderText,
    badge: renderBadge,
    alert: renderAlert,
    label: renderLabel,
    textarea: renderTextarea,
    select: renderSelect,
    checkbox: renderCheckbox,
    radio: renderRadio,
    'switch': renderSwitch,
    slider: renderSlider,
    code: renderCode,
    codeblock: renderCode,
    tabs: renderTabs,
    accordion: renderAccordion,
    sidebar: renderDiv,
    carousel: renderDiv,
    'dropdown-menu': renderDiv,
    'accordion-item': renderDiv,
    'accordion-header': renderDiv,
    'accordion-content': renderDiv,
    progress: renderProgress,
  };
  
  // Main App Component
  function RantirApp() {
    const [pageData, setPageData] = useState({});
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
      async function loadData() {
        const dataPromises = [];
        for (const conn of config.dataConnections) {
          dataPromises.push(
            window.__RANTIR_FETCH_DATA__(conn.tableId)
              .then(result => ({ tableId: conn.tableId, ...result }))
          );
        }
        
        const results = await Promise.all(dataPromises);
        const dataMap = {};
        for (const result of results) {
          dataMap[result.tableId] = result.data || [];
        }
        setPageData(dataMap);
        setLoading(false);
      }
      
      if (config.dataConnections.length > 0) {
        loadData();
      } else {
        setLoading(false);
      }
    }, []);
    
    if (loading && config.dataConnections.length > 0) {
      return h('div', { className: 'min-h-screen flex items-center justify-center' },
        h('div', { className: 'animate-spin rounded-full h-12 w-12 border-b-2 border-primary' })
      );
    }
    
    const components = currentPage?.components || [];
    return h('div', { className: 'rantir-page' },
      components.map((comp, idx) => renderComponent(comp, idx, pageData))
    );
  }
  
  function renderComponent(component, key, pageData) {
    if (!component || !component.type) return null;
    const renderer = componentRenderers[component.type] || renderDiv;
    return renderer(component, key, pageData);
  }
  
  function extractValue(val, prop) {
    if (val === null || val === undefined) return null;
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return val;
    
    if (typeof val === 'object') {
      if ('top' in val && 'right' in val && 'bottom' in val && 'left' in val && !('width' in val) && !('style' in val)) {
        var unit = val.unit || 'px';
        var t = typeof val.top === 'number' ? val.top + unit : (val.top || '0');
        var r = typeof val.right === 'number' ? val.right + unit : (val.right || '0');
        var b = typeof val.bottom === 'number' ? val.bottom + unit : (val.bottom || '0');
        var l = typeof val.left === 'number' ? val.left + unit : (val.left || '0');
        return t + ' ' + r + ' ' + b + ' ' + l;
      }

      if (val.type === 'solid') {
        var colorVal = val.value || val.color;
        if (colorVal) {
          if (val.opacity !== undefined && val.opacity < 100) {
            var hex = colorVal;
            if (hex.startsWith('#') && hex.length >= 7) {
              var rv = parseInt(hex.slice(1, 3), 16);
              var gv = parseInt(hex.slice(3, 5), 16);
              var bv = parseInt(hex.slice(5, 7), 16);
              return 'rgba(' + rv + ',' + gv + ',' + bv + ',' + (val.opacity / 100) + ')';
            }
          }
          return colorVal;
        }
      }
      
      if (val.type === 'gradient' && val.gradient) {
        var g = val.gradient;
        var angle = g.angle || 180;
        var stops = (g.stops || []).map(function(s) { return s.color + ' ' + s.position + '%'; }).join(', ');
        return 'linear-gradient(' + angle + 'deg, ' + stops + ')';
      }

      if (val.stops && Array.isArray(val.stops)) {
        var angle2 = val.angle || val.direction || 180;
        var angleStr = typeof angle2 === 'number' ? angle2 + 'deg' : angle2;
        var stops2 = val.stops.map(function(s) { return s.color + ' ' + s.position + '%'; }).join(', ');
        return 'linear-gradient(' + angleStr + ', ' + stops2 + ')';
      }
      
      if ('value' in val) {
        var v = val.value;
        var unit2 = val.unit || 'px';
        if (v === 'auto' || v === 'none' || unit2 === 'auto') return v;
        if (typeof v === 'number') return v + (unit2 || 'px');
        return v;
      }
      
      if (('style' in val || 'width' in val) && !('top' in val && 'right' in val && 'bottom' in val && 'left' in val)) {
        var w = val.width || '0';
        var s = val.style || 'solid';
        var c = val.color || 'transparent';
        if (s === 'none' || w === '0' || w === 0) return 'none';
        return w + 'px ' + s + ' ' + c;
      }
      
      if ('topLeft' in val || 'topRight' in val || 'bottomLeft' in val || 'bottomRight' in val) {
        var u = val.unit || 'px';
        return (val.topLeft || 0) + u + ' ' + (val.topRight || 0) + u + ' ' + (val.bottomRight || 0) + u + ' ' + (val.bottomLeft || 0) + u;
      }
      
      if ('margin' in val || 'padding' in val) {
        return null;
      }
    }
    
    return val;
  }

  var STYLE_CATEGORIES = ['typography','spacing','sizing','layout','backgrounds','borders','effects','position'];

  function resolveClassStyles(classNames) {
    var merged = {};
    if (!classNames || !Array.isArray(classNames)) return merged;
    
    for (var i = 0; i < classNames.length; i++) {
      var cls = styleClassMap[classNames[i]];
      if (!cls || !cls.styles) continue;
      
      var styles = cls.styles;
      for (var key in styles) {
        if (!styles.hasOwnProperty(key)) continue;
        var value = styles[key];
        if (value === null || value === undefined) continue;
        
        if (typeof value === 'object' && !Array.isArray(value) && STYLE_CATEGORIES.indexOf(key) !== -1) {
          for (var nestedKey in value) {
            if (value.hasOwnProperty(nestedKey) && value[nestedKey] !== null && value[nestedKey] !== undefined) {
              merged[nestedKey] = value[nestedKey];
            }
          }
        } else {
          merged[key] = value;
        }
      }
      
      // Also flatten nested objects that might be stored at the top level of styles
      // e.g., styles.layout might exist alongside styles.display
      var extraCategories = ['layout', 'typography', 'spacing', 'sizing'];
      for (var ci = 0; ci < extraCategories.length; ci++) {
        var catKey = extraCategories[ci];
        if (styles[catKey] && typeof styles[catKey] === 'object') {
          var catObj = styles[catKey];
          for (var ck in catObj) {
            if (catObj.hasOwnProperty(ck) && catObj[ck] !== null && catObj[ck] !== undefined && merged[ck] === undefined) {
              merged[ck] = catObj[ck];
            }
          }
        }
      }
    }
    return merged;
  }

  function getStyles(props, classNames) {
    if (!props) props = {};
    if (!classNames) classNames = [];
    var styles = {};
    
    var classStyles = resolveClassStyles(classNames);
    var mergedProps = Object.assign({}, classStyles, props);
    
    // Background
    var bgColor = extractValue(mergedProps.backgroundColor, 'backgroundColor');
    if (!bgColor && mergedProps.background) {
      bgColor = extractValue(mergedProps.background, 'background');
    }
    if (bgColor) {
      if (typeof bgColor === 'string' && bgColor.includes('gradient')) {
        styles.backgroundImage = bgColor;
      } else {
        styles.backgroundColor = bgColor;
      }
    }
    
    if (!bgColor && !styles.backgroundColor && !styles.backgroundImage && mergedProps.backgrounds && Array.isArray(mergedProps.backgrounds)) {
      var bg = mergedProps.backgrounds[0];
      if (bg) {
        var resolved = extractValue(bg, 'background');
        if (resolved) {
          if (typeof resolved === 'string' && resolved.includes('gradient')) {
            styles.backgroundImage = resolved;
          } else {
            styles.backgroundColor = resolved;
          }
        }
      }
    }

    if (mergedProps.backgroundGradient) {
      var g = mergedProps.backgroundGradient;
      if (typeof g === 'string') {
        styles.backgroundImage = g;
      } else if (g.stops && Array.isArray(g.stops)) {
        var angle = g.angle || 180;
        var stops = g.stops.map(function(s) { return s.color + ' ' + s.position + '%'; }).join(', ');
        styles.backgroundImage = 'linear-gradient(' + angle + 'deg, ' + stops + ')';
      }
    }

    if (mergedProps.backgroundImage) {
      if (typeof mergedProps.backgroundImage === 'string') {
        var bgImgStr = mergedProps.backgroundImage;
        if (bgImgStr.startsWith('url(') || bgImgStr.startsWith('linear-gradient') || bgImgStr.startsWith('radial-gradient')) {
          styles.backgroundImage = bgImgStr;
        } else {
          styles.backgroundImage = 'url(' + bgImgStr + ')';
        }
      } else if (typeof mergedProps.backgroundImage === 'object' && mergedProps.backgroundImage.url) {
        var imgObj = mergedProps.backgroundImage;
        styles.backgroundImage = 'url(' + imgObj.url + ')';
        styles.backgroundSize = imgObj.size || 'cover';
        styles.backgroundPosition = (imgObj.position || 'center').replace(/-/g, ' ');
        styles.backgroundRepeat = imgObj.repeat || 'no-repeat';
      }
    }
    if (mergedProps.backgroundSize) styles.backgroundSize = mergedProps.backgroundSize;
    
    // Typography
    var typo = mergedProps.typography || {};
    if (mergedProps.color) styles.color = mergedProps.color;
    else if (typo.color) styles.color = typo.color;
    if (typo.fontSize || mergedProps.fontSize) {
      var fs = typo.fontSize || mergedProps.fontSize;
      styles.fontSize = typeof fs === 'number' ? fs + 'px' : (fs + '').replace(/px$/, '') + 'px';
    }
    if (mergedProps.fontWeight !== undefined ? mergedProps.fontWeight : typo.fontWeight) styles.fontWeight = mergedProps.fontWeight !== undefined ? mergedProps.fontWeight : typo.fontWeight;
    if (mergedProps.fontFamily || typo.fontFamily) styles.fontFamily = mergedProps.fontFamily || typo.fontFamily;
    if (mergedProps.textAlign || typo.textAlign) styles.textAlign = mergedProps.textAlign || typo.textAlign;
    if (mergedProps.lineHeight || typo.lineHeight) styles.lineHeight = mergedProps.lineHeight || typo.lineHeight;
    if (mergedProps.letterSpacing || typo.letterSpacing) styles.letterSpacing = mergedProps.letterSpacing || typo.letterSpacing;
    if (mergedProps.textTransform || typo.textTransform) styles.textTransform = mergedProps.textTransform || typo.textTransform;
    if (mergedProps.textDecoration || typo.textDecoration) styles.textDecoration = mergedProps.textDecoration || typo.textDecoration;
    
    // Spacing
    var spacing = mergedProps.spacingControl || {};
    var margin = spacing.margin || {};
    var padding = spacing.padding || {};
    var mUnit = margin.unit || 'px';
    var pUnit = padding.unit || 'px';
    
    if (margin.top && margin.top !== '0') styles.marginTop = margin.top + mUnit;
    if (margin.bottom && margin.bottom !== '0') styles.marginBottom = margin.bottom + mUnit;
    if (margin.left && margin.left !== '0') styles.marginLeft = margin.left + mUnit;
    if (margin.right && margin.right !== '0') styles.marginRight = margin.right + mUnit;
    if (padding.top && padding.top !== '0') styles.paddingTop = padding.top + pUnit;
    if (padding.bottom && padding.bottom !== '0') styles.paddingBottom = padding.bottom + pUnit;
    if (padding.left && padding.left !== '0') styles.paddingLeft = padding.left + pUnit;
    if (padding.right && padding.right !== '0') styles.paddingRight = padding.right + pUnit;
    
    if (mergedProps.padding && typeof mergedProps.padding === 'object' && 'top' in mergedProps.padding) {
      var p = mergedProps.padding;
      var pu = p.unit || 'px';
      if (p.top !== undefined && p.top !== 0) styles.paddingTop = p.top + pu;
      if (p.right !== undefined && p.right !== 0) styles.paddingRight = p.right + pu;
      if (p.bottom !== undefined && p.bottom !== 0) styles.paddingBottom = p.bottom + pu;
      if (p.left !== undefined && p.left !== 0) styles.paddingLeft = p.left + pu;
    }
    
    if (mergedProps.margin && typeof mergedProps.margin === 'object' && 'top' in mergedProps.margin) {
      var m = mergedProps.margin;
      var mu = m.unit || 'px';
      if (m.top !== undefined && m.top !== 0) styles.marginTop = m.top + mu;
      if (m.right !== undefined && m.right !== 0) styles.marginRight = m.right + mu;
      if (m.bottom !== undefined && m.bottom !== 0) styles.marginBottom = m.bottom + mu;
      if (m.left !== undefined && m.left !== 0) styles.marginLeft = m.left + mu;
    }
    
    if (mergedProps.marginTop) styles.marginTop = mergedProps.marginTop;
    if (mergedProps.marginBottom) styles.marginBottom = mergedProps.marginBottom;
    if (mergedProps.marginLeft) styles.marginLeft = mergedProps.marginLeft;
    if (mergedProps.marginRight) styles.marginRight = mergedProps.marginRight;
    if (mergedProps.paddingTop) styles.paddingTop = mergedProps.paddingTop;
    if (mergedProps.paddingBottom) styles.paddingBottom = mergedProps.paddingBottom;
    if (mergedProps.paddingLeft) styles.paddingLeft = mergedProps.paddingLeft;
    if (mergedProps.paddingRight) styles.paddingRight = mergedProps.paddingRight;
    
    // Sizing
    var w = extractValue(mergedProps.width, 'width');
    var ht = extractValue(mergedProps.height, 'height');
    var minW = extractValue(mergedProps.minWidth, 'minWidth');
    var minH = extractValue(mergedProps.minHeight, 'minHeight');
    var maxW = extractValue(mergedProps.maxWidth, 'maxWidth');
    var maxH = extractValue(mergedProps.maxHeight, 'maxHeight');
    
    if (w && w !== 'auto') styles.width = w;
    if (ht && ht !== 'auto') styles.height = ht;
    if (minW && minW !== '0' && minW !== '0px') styles.minWidth = minW;
    if (minH && minH !== '0' && minH !== '0px') styles.minHeight = minH;
    if (maxW && maxW !== 'none') styles.maxWidth = maxW;
    if (maxH && maxH !== 'none') styles.maxHeight = maxH;
    
    // Layout
    if (mergedProps.display) styles.display = mergedProps.display;
    if (mergedProps.flexDirection) styles.flexDirection = mergedProps.flexDirection;
    if (mergedProps.justifyContent) styles.justifyContent = mergedProps.justifyContent;
    if (mergedProps.alignItems) styles.alignItems = mergedProps.alignItems;
    if (mergedProps.gap) styles.gap = typeof mergedProps.gap === 'number' ? mergedProps.gap + 'px' : mergedProps.gap;
    if (mergedProps.flexWrap) styles.flexWrap = mergedProps.flexWrap;
    if (mergedProps.flex) styles.flex = mergedProps.flex;
    if (mergedProps.flexGrow !== undefined) styles.flexGrow = mergedProps.flexGrow;
    if (mergedProps.flexShrink !== undefined) styles.flexShrink = mergedProps.flexShrink;
    if (mergedProps.flexBasis) styles.flexBasis = mergedProps.flexBasis;
    if (mergedProps.alignSelf) styles.alignSelf = mergedProps.alignSelf;
    if (mergedProps.alignContent) styles.alignContent = mergedProps.alignContent;
    if (mergedProps.justifySelf) styles.justifySelf = mergedProps.justifySelf;
    if (mergedProps.rowGap) styles.rowGap = typeof mergedProps.rowGap === 'number' ? mergedProps.rowGap + 'px' : mergedProps.rowGap;
    if (mergedProps.columnGap) styles.columnGap = typeof mergedProps.columnGap === 'number' ? mergedProps.columnGap + 'px' : mergedProps.columnGap;
    if (mergedProps.order !== undefined) styles.order = mergedProps.order;
    
    // Grid
    if (mergedProps.gridTemplateColumns) styles.gridTemplateColumns = mergedProps.gridTemplateColumns;
    if (mergedProps.gridTemplateRows) styles.gridTemplateRows = mergedProps.gridTemplateRows;
    if (mergedProps.gridAutoFlow) styles.gridAutoFlow = mergedProps.gridAutoFlow;
    if (mergedProps.gridColumn) styles.gridColumn = mergedProps.gridColumn;
    if (mergedProps.gridRow) styles.gridRow = mergedProps.gridRow;
    if (mergedProps.gridAutoColumns) styles.gridAutoColumns = mergedProps.gridAutoColumns;
    if (mergedProps.gridAutoRows) styles.gridAutoRows = mergedProps.gridAutoRows;
    
    // Border
    var border = extractValue(mergedProps.border, 'border');
    if (border && border !== 'none') styles.border = border;
    var br = extractValue(mergedProps.borderRadius, 'borderRadius');
    if (br) styles.borderRadius = br;
    
    // Effects
    if (mergedProps.boxShadow) {
      if (Array.isArray(mergedProps.boxShadow)) {
        var enabledShadows = mergedProps.boxShadow.filter(function(s) { return s.enabled !== false; });
        if (enabledShadows.length > 0) {
          styles.boxShadow = enabledShadows.map(function(s) {
            var inset = s.type === 'inner' || s.type === 'inset' ? 'inset ' : '';
            return inset + (s.x || 0) + 'px ' + (s.y || 0) + 'px ' + (s.blur || 0) + 'px ' + (s.spread || 0) + 'px ' + (s.color || 'rgba(0,0,0,0.1)');
          }).join(', ');
        }
      } else if (typeof mergedProps.boxShadow === 'string' && mergedProps.boxShadow !== 'none') {
        styles.boxShadow = mergedProps.boxShadow;
      }
    }
    if (mergedProps.opacity !== undefined && mergedProps.opacity !== 1) styles.opacity = mergedProps.opacity;
    if (mergedProps.backdropFilter) styles.backdropFilter = mergedProps.backdropFilter;
    if (mergedProps.transition) {
      if (Array.isArray(mergedProps.transition)) {
        var enabledTransitions = mergedProps.transition.filter(function(t) { return t.enabled !== false; });
        if (enabledTransitions.length > 0) {
          styles.transition = enabledTransitions.map(function(t) {
            return (t.property || 'all') + ' ' + (t.duration || 200) + 'ms ' + (t.easing || 'ease') + ' ' + (t.delay || 0) + 'ms';
          }).join(', ');
        }
      } else {
        styles.transition = mergedProps.transition;
      }
    }
    
    // Position
    if (mergedProps.position && mergedProps.position !== 'static') styles.position = mergedProps.position;
    var top = extractValue(mergedProps.top, 'top');
    var right = extractValue(mergedProps.right, 'right');
    var bottom = extractValue(mergedProps.bottom, 'bottom');
    var left = extractValue(mergedProps.left, 'left');
    if (top && top !== 'auto') styles.top = top;
    if (right && right !== 'auto') styles.right = right;
    if (bottom && bottom !== 'auto') styles.bottom = bottom;
    if (left && left !== 'auto') styles.left = left;
    if (mergedProps.zIndex && mergedProps.zIndex !== 'auto') styles.zIndex = mergedProps.zIndex;
    
    // Overflow
    if (mergedProps.overflow) styles.overflow = mergedProps.overflow;
    if (mergedProps.overflowX) styles.overflowX = mergedProps.overflowX;
    if (mergedProps.overflowY) styles.overflowY = mergedProps.overflowY;
    
    // Text/misc
    if (mergedProps.whiteSpace) styles.whiteSpace = mergedProps.whiteSpace;
    if (mergedProps.wordBreak) styles.wordBreak = mergedProps.wordBreak;
    if (mergedProps.textOverflow) styles.textOverflow = mergedProps.textOverflow;
    if (mergedProps.cursor) styles.cursor = mergedProps.cursor;
    if (mergedProps.objectFit) styles.objectFit = mergedProps.objectFit;
    if (mergedProps.objectPosition) styles.objectPosition = mergedProps.objectPosition;
    if (mergedProps.listStyle) styles.listStyle = mergedProps.listStyle;
    if (mergedProps.listStyleType) styles.listStyleType = mergedProps.listStyleType;
    if (mergedProps.verticalAlign) styles.verticalAlign = mergedProps.verticalAlign;
    
    // Transform
    if (mergedProps.transform) {
      if (typeof mergedProps.transform === 'string') {
        styles.transform = mergedProps.transform;
      } else if (typeof mergedProps.transform === 'object') {
        var parts = [];
        var tr = mergedProps.transform;
        if (tr.translate && tr.translate.enabled !== false && (tr.translate.x || tr.translate.y || tr.translate.z)) {
          var tu = tr.translate.unit || 'px';
          if (tr.translate.z) {
            parts.push('translate3d(' + (tr.translate.x || 0) + tu + ',' + (tr.translate.y || 0) + tu + ',' + (tr.translate.z || 0) + tu + ')');
          } else {
            parts.push('translate(' + (tr.translate.x || 0) + tu + ',' + (tr.translate.y || 0) + tu + ')');
          }
        }
        if (tr.scale && tr.scale.enabled !== false && (tr.scale.x !== 100 || tr.scale.y !== 100)) {
          parts.push('scale(' + (tr.scale.x || 100) / 100 + ',' + (tr.scale.y || 100) / 100 + ')');
        }
        if (tr.rotate && tr.rotate.enabled !== false) {
          if (tr.rotate.x) parts.push('rotateX(' + tr.rotate.x + 'deg)');
          if (tr.rotate.y) parts.push('rotateY(' + tr.rotate.y + 'deg)');
          if (tr.rotate.z) parts.push('rotateZ(' + tr.rotate.z + 'deg)');
        }
        if (tr.skew && tr.skew.enabled !== false && (tr.skew.x || tr.skew.y)) {
          parts.push('skew(' + (tr.skew.x || 0) + 'deg,' + (tr.skew.y || 0) + 'deg)');
        }
        if (parts.length > 0) styles.transform = parts.join(' ');
      }
    }
    // Filter
    if (mergedProps.filter) {
      if (Array.isArray(mergedProps.filter)) {
        var enabledFilters = mergedProps.filter.filter(function(f) { return f.enabled !== false; });
        if (enabledFilters.length > 0) {
          styles.filter = enabledFilters.map(function(f) {
            return (f['function'] || f.fn || 'blur') + '(' + (f.value || 0) + (f.unit || 'px') + ')';
          }).join(' ');
        }
      } else if (typeof mergedProps.filter === 'string') {
        styles.filter = mergedProps.filter;
      }
    }
    if (mergedProps.borderColor) styles.borderColor = mergedProps.borderColor;
    if (mergedProps.borderWidth) styles.borderWidth = typeof mergedProps.borderWidth === 'number' ? mergedProps.borderWidth + 'px' : mergedProps.borderWidth;
    if (mergedProps.borderStyle) styles.borderStyle = mergedProps.borderStyle;
    // Border sides
    if (mergedProps.borderTop) { var _bt = extractValue(mergedProps.borderTop, 'border'); if (_bt && _bt !== 'none') styles.borderTop = _bt; }
    if (mergedProps.borderBottom) { var _bb = extractValue(mergedProps.borderBottom, 'border'); if (_bb && _bb !== 'none') styles.borderBottom = _bb; }
    if (mergedProps.borderLeft) { var _bl = extractValue(mergedProps.borderLeft, 'border'); if (_bl && _bl !== 'none') styles.borderLeft = _bl; }
    if (mergedProps.borderRight) { var _br2 = extractValue(mergedProps.borderRight, 'border'); if (_br2 && _br2 !== 'none') styles.borderRight = _br2; }
    if (mergedProps.backgroundPosition) styles.backgroundPosition = mergedProps.backgroundPosition;
    if (mergedProps.backgroundRepeat) styles.backgroundRepeat = mergedProps.backgroundRepeat;
    if (mergedProps.aspectRatio) styles.aspectRatio = mergedProps.aspectRatio;
    if (mergedProps.visibility) styles.visibility = mergedProps.visibility;
    if (mergedProps.textShadow) styles.textShadow = mergedProps.textShadow;

    // Plural effect keys
    if (!styles.boxShadow && mergedProps.boxShadows && Array.isArray(mergedProps.boxShadows)) {
      var _es = mergedProps.boxShadows.filter(function(s) { return s.enabled !== false; });
      if (_es.length > 0) {
        styles.boxShadow = _es.map(function(s) {
          var inset = s.type === 'inner' || s.type === 'inset' ? 'inset ' : '';
          return inset + (s.x||0) + 'px ' + (s.y||0) + 'px ' + (s.blur||0) + 'px ' + (s.spread||0) + 'px ' + (s.color || 'rgba(0,0,0,0.1)');
        }).join(', ');
      }
    }
    if (!styles.filter && mergedProps.filters && Array.isArray(mergedProps.filters)) {
      var _ef = mergedProps.filters.filter(function(f) { return f.enabled !== false; });
      if (_ef.length > 0) {
        styles.filter = _ef.map(function(f) {
          return (f['function'] || f.fn || 'blur') + '(' + (f.value||0) + (f.unit||'px') + ')';
        }).join(' ');
      }
    }
    if (!styles.transition && mergedProps.transitions && Array.isArray(mergedProps.transitions)) {
      var _et = mergedProps.transitions.filter(function(t) { return t.enabled !== false; });
      if (_et.length > 0) {
        styles.transition = _et.map(function(t) {
          return (t.property||'all') + ' ' + (t.duration||200) + 'ms ' + (t.easing||'ease') + ' ' + (t.delay||0) + 'ms';
        }).join(', ');
      }
    }
    if (!styles.transform && mergedProps.transforms && typeof mergedProps.transforms === 'object') {
      var _tp = [];
      var _tr = mergedProps.transforms;
      if (_tr.translate && _tr.translate.enabled !== false && (_tr.translate.x || _tr.translate.y || _tr.translate.z)) {
        var _tu = _tr.translate.unit || 'px';
        if (_tr.translate.z) {
          _tp.push('translate3d(' + (_tr.translate.x||0) + _tu + ',' + (_tr.translate.y||0) + _tu + ',' + (_tr.translate.z||0) + _tu + ')');
        } else {
          _tp.push('translate(' + (_tr.translate.x||0) + _tu + ',' + (_tr.translate.y||0) + _tu + ')');
        }
      }
      if (_tr.scale && _tr.scale.enabled !== false && (_tr.scale.x !== 100 || _tr.scale.y !== 100)) {
        _tp.push('scale(' + (_tr.scale.x||100)/100 + ',' + (_tr.scale.y||100)/100 + ')');
      }
      if (_tr.rotate && _tr.rotate.enabled !== false) {
        if (_tr.rotate.x) _tp.push('rotateX(' + _tr.rotate.x + 'deg)');
        if (_tr.rotate.y) _tp.push('rotateY(' + _tr.rotate.y + 'deg)');
        if (_tr.rotate.z) _tp.push('rotateZ(' + _tr.rotate.z + 'deg)');
      }
      if (_tr.skew && _tr.skew.enabled !== false && (_tr.skew.x || _tr.skew.y)) {
        _tp.push('skew(' + (_tr.skew.x||0) + 'deg,' + (_tr.skew.y||0) + 'deg)');
      }
      if (_tp.length > 0) styles.transform = _tp.join(' ');
    }
    
    return styles;
  }
  
  function buildClassName(classNames, propsClassName) {
    return [].concat(classNames || []).concat(propsClassName || '').filter(Boolean).join(' ');
  }

  // Component Renderers
  function renderDiv(component, key, pageData) {
    var props = component.props || {};
    var classNames = component.classNames || props.appliedClasses || [];
    var children = component.children || [];
    var styles = getStyles(props, classNames);
    
    // Default containers/divs to display:flex + flexDirection:column if they have children and no explicit display
    if (children.length > 0 && !styles.display && !styles.gridTemplateColumns) {
      styles.display = 'flex';
      if (!styles.flexDirection) styles.flexDirection = 'column';
    }
    
    // Ensure flex items can shrink properly (prevents text overflow in flex rows)
    if (!styles.minWidth && !styles.width) {
      styles.minWidth = '0';
    }
    
    return h('div', { 
      key, 
      style: styles,
      className: buildClassName(classNames, props.className)
    }, children.map(function(child, idx) { return renderComponent(child, key + '-' + idx, pageData); }));
  }
  
  function renderText(component, key) {
    var props = component.props || {};
    var classNames = component.classNames || props.appliedClasses || [];
    var styles = getStyles(props, classNames);
    // Only force full width when textAlign is set and no explicit width exists
    if (!styles.width && styles.textAlign) styles.width = '100%';
    // Prevent text from overflowing flex containers
    if (!styles.overflow) styles.overflow = 'hidden';
    if (!styles.textOverflow) styles.textOverflow = 'ellipsis';
    var Tag = props.tag || 'p';
    return h(Tag, { key, style: styles, className: buildClassName(classNames, props.className) }, props.content || props.text || '');
  }
  
  function renderHeading(component, key) {
    var props = component.props || {};
    var classNames = component.classNames || props.appliedClasses || [];
    var styles = getStyles(props, classNames);
    // Only force full width when textAlign is set and no explicit width exists
    if (!styles.width && styles.textAlign) styles.width = '100%';
    // Prevent headings from overflowing flex containers
    if (!styles.overflow) styles.overflow = 'hidden';
    if (!styles.textOverflow) styles.textOverflow = 'ellipsis';
    var level = props.level || 1;
    var Tag = props.tag || (component.type && component.type.match(/^h[1-6]$/) ? component.type : 'h' + level);
    return h(Tag, { key, style: styles, className: buildClassName(classNames, props.className) }, props.content || props.text || '');
  }
  
  function renderBlockquote(component, key) {
    var props = component.props || {};
    var classNames = component.classNames || props.appliedClasses || [];
    var styles = getStyles(props, classNames);
    return h('blockquote', { key, style: styles, className: buildClassName(classNames, props.className) }, props.content || props.text || '');
  }
  
  function renderButton(component, key) {
    var props = component.props || {};
    var classNames = component.classNames || props.appliedClasses || [];
    var styles = getStyles(props, classNames);
    
    var handleClick = function() {
      if (props.action && props.action.type === 'navigate' && props.action.path) {
        window.__RANTIR_NAVIGATE__(props.action.path);
      } else if (props.action && props.action.type === 'link' && props.action.url) {
        window.open(props.action.url, props.action.target || '_blank');
      }
    };
    
    var cn = [].concat(classNames).concat(props.className || '').filter(Boolean).join(' ');
    return h('button', { 
      key, style: styles,
      className: 'px-4 py-2 rounded-lg ' + cn,
      onClick: handleClick
    }, props.text || props.label || props.content || 'Button');
  }
  
  function renderImage(component, key) {
    var props = component.props || {};
    var classNames = component.classNames || props.appliedClasses || [];
    var styles = getStyles(props, classNames);
    if (!props.src) return null;
    return h('img', { 
      key, src: props.src, alt: props.alt || '',
      style: Object.assign({}, styles, { objectFit: props.objectFit || 'cover' }),
      className: buildClassName(classNames, props.className)
    });
  }
  
  // Icon cache for fetched Iconsax SVG paths
  var _iconCache = {};
  
  function IconRenderer(props) {
    var iconName = props.iconName || 'Home2';
    var iconVariant = props.iconVariant || 'Bold';
    var iconSize = props.iconSize || 24;
    var iconColor = props.iconColor || 'currentColor';
    var containerStyles = props.containerStyles || {};
    var classNameStr = props.classNameStr || '';
    
    var _state = useState(null);
    var svgData = _state[0];
    var setSvgData = _state[1];
    
    useEffect(function() {
      var cacheKey = iconName + '_' + iconVariant;
      if (_iconCache[cacheKey]) {
        setSvgData(_iconCache[cacheKey]);
        return;
      }
      
      // Try Iconsax CDN first
      fetch('https://cdn.jsdelivr.net/npm/iconsax-react@0.0.8/dist/esm/' + iconName + '.js')
        .then(function(r) { 
          if (!r.ok) throw new Error('not found');
          return r.text(); 
        })
        .then(function(text) {
          try {
            // Parse SVG path data for the requested variant
            var variantRegex = new RegExp('var ' + iconVariant + ' = function[\\\\s\\\\S]*?return[\\\\s\\\\S]*?Fragment[\\\\s\\\\S]*?null,([\\\\s\\\\S]*?)\\\\);\\\\n};');
            var match = text.match(variantRegex);
            if (!match) {
              // Try Linear as fallback variant
              var fallbackRegex = new RegExp('var Linear = function[\\\\s\\\\S]*?return[\\\\s\\\\S]*?Fragment[\\\\s\\\\S]*?null,([\\\\s\\\\S]*?)\\\\);\\\\n};');
              match = text.match(fallbackRegex);
            }
            if (match) {
              // Extract all path d attributes and their properties
              var pathsStr = match[1];
              var paths = [];
              var pathRegex = new RegExp('createElement\\\\("path",\\\\s*\\\\{([^}]+)\\\\}', 'g');
              var pm;
              while ((pm = pathRegex.exec(pathsStr)) !== null) {
                var attrs = {};
                var dMatch = pm[1].match(new RegExp('d:\\\\s*"([^"]+)"'));
                if (dMatch) attrs.d = dMatch[1];
                var opMatch = pm[1].match(new RegExp('opacity:\\\\s*"([^"]+)"'));
                if (opMatch) attrs.opacity = opMatch[1];
                var strokeMatch = pm[1].match(new RegExp('stroke:\\\\s*color'));
                if (strokeMatch) attrs.useStroke = true;
                var fillMatch = pm[1].match(new RegExp('fill:\\\\s*color'));
                if (fillMatch) attrs.useFill = true;
                var swMatch = pm[1].match(new RegExp('strokeWidth:\\\\s*"([^"]+)"'));
                if (swMatch) attrs.strokeWidth = swMatch[1];
                var slcMatch = pm[1].match(new RegExp('strokeLinecap:\\\\s*"([^"]+)"'));
                if (slcMatch) attrs.strokeLinecap = slcMatch[1];
                var sljMatch = pm[1].match(new RegExp('strokeLinejoin:\\\\s*"([^"]+)"'));
                if (sljMatch) attrs.strokeLinejoin = sljMatch[1];
                if (attrs.d) paths.push(attrs);
              }
              if (paths.length > 0) {
                _iconCache[cacheKey] = paths;
                setSvgData(paths);
                return;
              }
            }
            throw new Error('parse failed');
          } catch(parseErr) {
            throw new Error('parse failed');
          }
        })
        .catch(function() {
          // Fallback to Lucide CDN
          var kebab = iconName.replace(new RegExp('([a-z0-9])([A-Z])', 'g'), '$1-$2').replace(new RegExp('([A-Z])([A-Z][a-z])', 'g'), '$1-$2').toLowerCase().replace(new RegExp('-?\\\\d+$'), '');
          _iconCache[cacheKey] = '__lucide__' + kebab;
          setSvgData('__lucide__' + kebab);
        });
    }, [iconName, iconVariant]);
    
    // Render Lucide fallback as img
    if (typeof svgData === 'string' && svgData.indexOf('__lucide__') === 0) {
      var lucideName = svgData.replace('__lucide__', '');
      return h('div', { style: containerStyles, className: classNameStr },
        h('img', { 
          src: 'https://unpkg.com/lucide-static@latest/icons/' + lucideName + '.svg',
          alt: iconName,
          style: { width: iconSize + 'px', height: iconSize + 'px' },
          onError: function(e) { e.target.style.display = 'none'; }
        })
      );
    }
    
    // Render Iconsax inline SVG
    if (svgData && Array.isArray(svgData)) {
      return h('div', { style: containerStyles, className: classNameStr },
        h('svg', { 
          xmlns: 'http://www.w3.org/2000/svg',
          width: iconSize, 
          height: iconSize, 
          viewBox: '0 0 24 24', 
          fill: 'none' 
        }, svgData.map(function(p, i) {
          var pathProps = { key: i, d: p.d };
          if (p.opacity) pathProps.opacity = p.opacity;
          if (p.useFill) pathProps.fill = iconColor;
          if (p.useStroke) { 
            pathProps.stroke = iconColor; 
            if (p.strokeWidth) pathProps.strokeWidth = p.strokeWidth;
            if (p.strokeLinecap) pathProps.strokeLinecap = p.strokeLinecap;
            if (p.strokeLinejoin) pathProps.strokeLinejoin = p.strokeLinejoin;
          }
          if (!p.useFill && !p.useStroke) pathProps.fill = iconColor;
          return h('path', pathProps);
        }))
      );
    }
    
    // Loading placeholder (invisible)
    return h('div', { style: Object.assign({}, containerStyles, { width: iconSize + 'px', height: iconSize + 'px' }), className: classNameStr });
  }
  
  function renderIcon(component, key) {
    var props = component.props || {};
    var classNames = component.classNames || props.appliedClasses || [];
    var styles = getStyles(props, classNames);
    
    var iconSizeMap = { xs: 12, sm: 16, md: 24, lg: 32, xl: 48 };
    var typo = props.typography || {};
    var iconSize = typo.fontSize ? parseInt(typo.fontSize, 10) : (props.iconSize || iconSizeMap[props.size] || 24);
    var iconColor = typo.color || props.color || 'currentColor';
    var iconName = props.iconName || props.icon || 'Home2';
    var iconVariant = props.iconVariant || 'Bold';
    
    var containerStyles = Object.assign({}, styles, {
      width: styles.width || 'fit-content',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center'
    });
    
    return h(IconRenderer, { 
      key: key,
      iconName: iconName, 
      iconVariant: iconVariant, 
      iconSize: iconSize, 
      iconColor: iconColor,
      containerStyles: containerStyles,
      classNameStr: buildClassName(classNames, props.className)
    });
  }
  
  function renderInput(component, key) {
    var props = component.props || {};
    var classNames = component.classNames || props.appliedClasses || [];
    var styles = getStyles(props, classNames);
    return h('input', { key, type: props.type || 'text', placeholder: props.placeholder || '', style: styles, className: 'px-3 py-2 border rounded-lg ' + buildClassName(classNames, props.className) });
  }
  
  function renderLink(component, key, pageData) {
    var props = component.props || {};
    var classNames = component.classNames || props.appliedClasses || [];
    var children = component.children || [];
    var styles = getStyles(props, classNames);
    var content = children.length > 0
      ? children.map(function(child, idx) { return renderComponent(child, key + '-' + idx, pageData); })
      : (props.content || props.text || props.label || 'Link');
    return h('a', { key, href: props.href || '#', target: props.target || '_self', style: styles, className: buildClassName(classNames, props.className) }, content);
  }
  
  function renderForm(component, key, pageData) {
    var props = component.props || {};
    var classNames = component.classNames || props.appliedClasses || [];
    var children = component.children || [];
    var styles = getStyles(props, classNames);
    return h('form', { key, style: styles, className: buildClassName(classNames, props.className), onSubmit: function(e) { e.preventDefault(); } }, children.map(function(child, idx) { return renderComponent(child, key + '-' + idx, pageData); }));
  }
  
  function renderSection(component, key, pageData) {
    var props = component.props || {};
    var classNames = component.classNames || props.appliedClasses || [];
    var children = component.children || [];
    var styles = getStyles(props, classNames);
    if (children.length > 0 && !styles.display && !styles.gridTemplateColumns) {
      styles.display = 'flex';
      if (!styles.flexDirection) styles.flexDirection = 'column';
    }
    return h('section', { key, style: styles, className: buildClassName(classNames, props.className) }, children.map(function(child, idx) { return renderComponent(child, key + '-' + idx, pageData); }));
  }
  
  function renderHeader(component, key, pageData) {
    var props = component.props || {};
    var classNames = component.classNames || props.appliedClasses || [];
    var children = component.children || [];
    var styles = getStyles(props, classNames);
    return h('header', { key, style: styles, className: buildClassName(classNames, props.className) }, children.map(function(child, idx) { return renderComponent(child, key + '-' + idx, pageData); }));
  }
  
  function renderFooter(component, key, pageData) {
    var props = component.props || {};
    var classNames = component.classNames || props.appliedClasses || [];
    var children = component.children || [];
    var styles = getStyles(props, classNames);
    return h('footer', { key, style: styles, className: buildClassName(classNames, props.className) }, children.map(function(child, idx) { return renderComponent(child, key + '-' + idx, pageData); }));
  }
  
  function renderNav(component, key, pageData) {
    var props = component.props || {};
    var classNames = component.classNames || props.appliedClasses || [];
    var children = component.children || [];
    var styles = getStyles(props, classNames);
    return h('nav', { key, style: styles, className: buildClassName(classNames, props.className) }, children.map(function(child, idx) { return renderComponent(child, key + '-' + idx, pageData); }));
  }
  
  function renderCard(component, key, pageData) {
    var props = component.props || {};
    var classNames = component.classNames || props.appliedClasses || [];
    var children = component.children || [];
    var baseStyles = getStyles(props, classNames);
    var styles = Object.assign({}, baseStyles, {
      borderRadius: baseStyles.borderRadius || props.borderRadius || '8px',
      boxShadow: baseStyles.boxShadow || props.boxShadow || '0 1px 3px rgba(0,0,0,0.1)'
    });
    return h('div', { key, style: styles, className: buildClassName(classNames, props.className) }, children.map(function(child, idx) { return renderComponent(child, key + '-' + idx, pageData); }));
  }
  
  function renderList(component, key, pageData) {
    var props = component.props || {};
    var classNames = component.classNames || props.appliedClasses || [];
    var styles = getStyles(props, classNames);
    var Tag = props.ordered ? 'ol' : 'ul';
    var items = props.items || [];
    return h(Tag, { key, style: styles, className: buildClassName(classNames, props.className) }, items.map(function(item, idx) { return h('li', { key: idx }, item); }));
  }
  
  function renderVideo(component, key) {
    var props = component.props || {};
    var classNames = component.classNames || props.appliedClasses || [];
    var styles = getStyles(props, classNames);
    return h('video', { key, src: props.src, controls: props.controls !== false, autoPlay: props.autoPlay, muted: props.muted, loop: props.loop, style: styles, className: buildClassName(classNames, props.className) });
  }
  
  function renderSpacer(component, key) {
    var props = component.props || {};
    return h('div', { key, style: { height: props.height || '20px', width: '100%' } });
  }
  
  function renderSeparator(component, key) {
    var props = component.props || {};
    return h('hr', { key, style: { borderColor: props.color || '#e5e7eb', borderWidth: props.thickness || '1px', margin: (props.spacing || '16px') + ' 0' }, className: buildClassName(component.classNames || props.appliedClasses || [], props.className) });
  }

  function renderBadge(component, key) {
    var props = component.props || {};
    var classNames = component.classNames || props.appliedClasses || [];
    var styles = getStyles(props, classNames);
    return h('span', { key, style: Object.assign({ display: 'inline-flex', alignItems: 'center', padding: '2px 10px', borderRadius: '9999px', fontSize: '12px', fontWeight: '500' }, styles), className: buildClassName(classNames, props.className) }, props.content || props.text || '');
  }

  function renderAlert(component, key, pageData) {
    var props = component.props || {};
    var classNames = component.classNames || props.appliedClasses || [];
    var children = component.children || [];
    var styles = getStyles(props, classNames);
    var content = children.length > 0
      ? children.map(function(child, idx) { return renderComponent(child, key + '-' + idx, pageData); })
      : (props.content || props.text || '');
    return h('div', { key, role: 'alert', style: Object.assign({ padding: '12px 16px', borderRadius: '8px', border: '1px solid currentColor' }, styles), className: buildClassName(classNames, props.className) }, content);
  }

  function renderLabel(component, key) {
    var props = component.props || {};
    var classNames = component.classNames || props.appliedClasses || [];
    var styles = getStyles(props, classNames);
    return h('label', { key, style: styles, className: buildClassName(classNames, props.className) }, props.content || props.text || '');
  }

  function renderTextarea(component, key) {
    var props = component.props || {};
    var classNames = component.classNames || props.appliedClasses || [];
    var styles = getStyles(props, classNames);
    return h('textarea', { key, placeholder: props.placeholder || '', rows: props.rows || 4, style: Object.assign({ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px', width: '100%' }, styles), className: buildClassName(classNames, props.className) });
  }

  function renderSelect(component, key) {
    var props = component.props || {};
    var classNames = component.classNames || props.appliedClasses || [];
    var styles = getStyles(props, classNames);
    var options = (props.options || []).map(function(opt, idx) {
      var label = typeof opt === 'string' ? opt : (opt.label || opt.value || '');
      var value = typeof opt === 'string' ? opt : (opt.value || '');
      return h('option', { key: idx, value: value }, label);
    });
    return h('select', { key, style: Object.assign({ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '6px' }, styles), className: buildClassName(classNames, props.className) }, options);
  }

  function renderCheckbox(component, key) {
    var props = component.props || {};
    var classNames = component.classNames || props.appliedClasses || [];
    var styles = getStyles(props, classNames);
    return h('label', { key, style: Object.assign({ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }, styles), className: buildClassName(classNames, props.className) },
      h('input', { type: 'checkbox', checked: props.checked || false, readOnly: true }),
      h('span', null, props.label || props.text || props.content || '')
    );
  }

  function renderRadio(component, key) {
    var props = component.props || {};
    var classNames = component.classNames || props.appliedClasses || [];
    var styles = getStyles(props, classNames);
    return h('label', { key, style: Object.assign({ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }, styles), className: buildClassName(classNames, props.className) },
      h('input', { type: 'radio', name: props.name || 'radio', checked: props.checked || false, readOnly: true }),
      h('span', null, props.label || props.text || props.content || '')
    );
  }

  function renderSwitch(component, key) {
    var props = component.props || {};
    var classNames = component.classNames || props.appliedClasses || [];
    var styles = getStyles(props, classNames);
    var checked = props.checked || false;
    return h('label', { key, style: Object.assign({ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }, styles), className: buildClassName(classNames, props.className) },
      h('div', { style: { width: '40px', height: '22px', borderRadius: '11px', backgroundColor: checked ? 'hsl(var(--primary))' : '#d1d5db', position: 'relative', transition: 'background-color 0.2s' } },
        h('div', { style: { width: '18px', height: '18px', borderRadius: '50%', backgroundColor: '#fff', position: 'absolute', top: '2px', left: checked ? '20px' : '2px', transition: 'left 0.2s' } })
      ),
      props.label ? h('span', null, props.label) : null
    );
  }

  function renderSlider(component, key) {
    var props = component.props || {};
    var classNames = component.classNames || props.appliedClasses || [];
    var styles = getStyles(props, classNames);
    return h('input', { key, type: 'range', min: props.min || 0, max: props.max || 100, value: props.value || 50, readOnly: true, style: Object.assign({ width: '100%' }, styles), className: buildClassName(classNames, props.className) });
  }

  function renderCode(component, key) {
    var props = component.props || {};
    var classNames = component.classNames || props.appliedClasses || [];
    var styles = getStyles(props, classNames);
    var content = props.content || props.text || props.code || '';
    return h('pre', { key, style: Object.assign({ backgroundColor: '#1e1e1e', color: '#d4d4d4', padding: '16px', borderRadius: '8px', overflow: 'auto', fontSize: '13px', fontFamily: 'monospace' }, styles), className: buildClassName(classNames, props.className) },
      h('code', null, content)
    );
  }

  function renderTabs(component, key, pageData) {
    var props = component.props || {};
    var classNames = component.classNames || props.appliedClasses || [];
    var children = component.children || [];
    var styles = getStyles(props, classNames);
    return h('div', { key, style: styles, className: buildClassName(classNames, props.className) },
      children.map(function(child, idx) { return renderComponent(child, key + '-' + idx, pageData); })
    );
  }

  function renderAccordion(component, key, pageData) {
    var props = component.props || {};
    var classNames = component.classNames || props.appliedClasses || [];
    var children = component.children || [];
    var styles = getStyles(props, classNames);
    
    // Check for children-based items (new architecture) or legacy props.items
    var hasChildItems = children.length > 0 && children.some(function(c) { return c.type === 'accordion-item'; });
    
    var items;
    if (hasChildItems) {
      items = children.filter(function(c) { return c.type === 'accordion-item'; }).map(function(item) {
        var headerChild = (item.children || []).find(function(c) { return c.type === 'accordion-header'; });
        var contentChild = (item.children || []).find(function(c) { return c.type === 'accordion-content'; });
        return {
          id: item.id,
          title: (item.props && item.props.title) || (headerChild && headerChild.props && headerChild.props.content) || 'Section',
          content: (contentChild && contentChild.props && contentChild.props.content) || 'Content...',
          headerComponent: headerChild,
          contentComponent: contentChild,
          itemComponent: item
        };
      });
    } else {
      try {
        items = Array.isArray(props.items) ? props.items : (typeof props.items === 'string' ? JSON.parse(props.items) : [{ id: 'item-1', title: 'Section 1', content: 'Content for section 1' }]);
      } catch(e) {
        items = [{ id: 'item-1', title: 'Section 1', content: 'Content for section 1' }];
      }
    }
    
    return h(AccordionWidget, { key: key, items: items, props: props, styles: styles, classNames: classNames, pageData: pageData, hasChildItems: hasChildItems });
  }
  
  function AccordionWidget(widgetProps) {
    var items = widgetProps.items;
    var props = widgetProps.props;
    var styles = widgetProps.styles;
    var classNames = widgetProps.classNames;
    var pageData = widgetProps.pageData;
    var hasChildItems = widgetProps.hasChildItems;
    
    var defaultVal = props.defaultValue || (items[0] && items[0].id);
    var _openState = useState(defaultVal ? [defaultVal] : []);
    var openItems = _openState[0];
    var setOpenItems = _openState[1];
    
    var toggleItem = function(itemId) {
      if (props.type === 'multiple') {
        setOpenItems(function(prev) {
          return prev.indexOf(itemId) !== -1 ? prev.filter(function(id) { return id !== itemId; }) : prev.concat([itemId]);
        });
      } else {
        setOpenItems(function(prev) {
          if (prev.indexOf(itemId) !== -1) return props.collapsible !== false ? [] : prev;
          return [itemId];
        });
      }
    };
    
    var separated = props.variant === 'separated' || props.variant === 'elevated' || props.separated !== false;
    var wrapperClass = separated ? '' : '';
    
    return h('div', { style: styles, className: buildClassName(classNames, props.className) },
      items.map(function(item, idx) {
        var isOpen = openItems.indexOf(item.id) !== -1;
        var itemStyle = {
          overflow: 'hidden',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          marginBottom: separated ? '8px' : '0'
        };
        
        var headerStyle = {
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '16px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontWeight: '500',
          fontSize: 'inherit',
          color: 'inherit',
          textAlign: 'left'
        };
        
        var chevronStyle = {
          width: '16px',
          height: '16px',
          flexShrink: '0',
          transition: 'transform 200ms ease',
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
        };
        
        var contentStyle = {
          maxHeight: isOpen ? '2000px' : '0',
          opacity: isOpen ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 200ms ease, opacity 200ms ease'
        };
        
        var contentInner = hasChildItems && item.contentComponent
          ? renderComponent(item.contentComponent, idx + '-content', pageData)
          : h('span', { style: { fontSize: '14px', color: '#6b7280' } }, item.content || 'Content here...');
        
        return h('div', { key: item.id || idx, style: itemStyle },
          h('button', { style: headerStyle, onClick: function() { toggleItem(item.id); } },
            h('span', null, item.title || 'Section ' + (idx + 1)),
            h('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round', style: chevronStyle },
              h('path', { d: 'm6 9 6 6 6-6' })
            )
          ),
          h('div', { style: contentStyle },
            h('div', { style: { padding: '0 16px 16px' } }, contentInner)
          )
        );
      })
    );
  }

  function renderProgress(component, key) {
    var props = component.props || {};
    var classNames = component.classNames || props.appliedClasses || [];
    var styles = getStyles(props, classNames);
    var value = props.value || 0;
    return h('div', { key, style: Object.assign({ width: '100%', height: '8px', backgroundColor: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }, styles), className: buildClassName(classNames, props.className) },
      h('div', { style: { width: value + '%', height: '100%', backgroundColor: 'hsl(var(--primary))', borderRadius: '4px', transition: 'width 0.3s' } })
    );
  }

  // Mount the app
  var container = document.getElementById('rantir-app');
  var root = ReactDOM.createRoot(container);
  root.render(h(RantirApp));
  } catch(err) {
    console.error('Rantir runtime error:', err);
    var el = document.getElementById('rantir-app');
    if (el) el.innerHTML = '<div style="padding:40px;text-align:center;"><h2>Something went wrong</h2><p>' + (err.message || 'Unknown error') + '</p></div>';
  }
})();
`;
}
