// Layer Tree Export Plugin for Figma

// =====================
// Tree出力用
// =====================
function getNodeInfo(node, prefix, isLast) {
  var connector = isLast ? '└── ' : '├── ';
  var result = prefix + connector + node.name + ' (' + node.type + ')\n';

  if ('children' in node && node.children.length > 0) {
    var childPrefix = prefix + (isLast ? '    ' : '│   ');
    for (var j = node.children.length - 1; j >= 0; j--) {
      var isChildLast = (j === 0);
      result += getNodeInfo(node.children[j], childPrefix, isChildLast);
    }
  }

  return result;
}

function getRootNodeInfo(node) {
  var result = node.name + ' (' + node.type + ')\n';

  if ('children' in node && node.children.length > 0) {
    for (var j = node.children.length - 1; j >= 0; j--) {
      var isChildLast = (j === 0);
      result += getNodeInfo(node.children[j], '', isChildLast);
    }
  }

  return result;
}

// =====================
// JSON出力用 - Figma全プロパティ
// =====================

function colorToHex(color) {
  if (!color) return null;
  var r = Math.round(color.r * 255).toString(16).padStart(2, '0');
  var g = Math.round(color.g * 255).toString(16).padStart(2, '0');
  var b = Math.round(color.b * 255).toString(16).padStart(2, '0');
  return '#' + r + g + b;
}

function colorToRgba(color, opacity) {
  if (!color) return null;
  var r = Math.round(color.r * 255);
  var g = Math.round(color.g * 255);
  var b = Math.round(color.b * 255);
  var a = opacity !== undefined ? opacity : 1;
  return 'rgba(' + r + ', ' + g + ', ' + b + ', ' + a.toFixed(2) + ')';
}

function getFills(node) {
  if (!('fills' in node) || !node.fills || node.fills === figma.mixed || node.fills.length === 0) return null;
  
  var fills = [];
  for (var i = 0; i < node.fills.length; i++) {
    var fill = node.fills[i];
    if (fill.visible === false) continue;
    
    var f = {
      type: fill.type,
      opacity: fill.opacity
    };
    
    if (fill.type === 'SOLID' && fill.color) {
      f.color = colorToHex(fill.color);
    } else if (fill.type.indexOf('GRADIENT') === 0) {
      f.gradientStops = [];
      if (fill.gradientStops) {
        for (var j = 0; j < fill.gradientStops.length; j++) {
          var stop = fill.gradientStops[j];
          f.gradientStops.push({
            position: Math.round(stop.position * 100) + '%',
            color: colorToHex(stop.color)
          });
        }
      }
    } else if (fill.type === 'IMAGE') {
      f.scaleMode = fill.scaleMode;
      f.imageHash = fill.imageHash;
    }
    
    fills.push(f);
  }
  
  return fills.length > 0 ? fills : null;
}

function getStrokes(node) {
  if (!('strokes' in node) || !node.strokes || node.strokes.length === 0) return null;
  
  var strokes = [];
  for (var i = 0; i < node.strokes.length; i++) {
    var stroke = node.strokes[i];
    if (stroke.visible === false) continue;
    
    var s = { type: stroke.type };
    if (stroke.type === 'SOLID' && stroke.color) {
      s.color = colorToHex(stroke.color);
      s.opacity = stroke.opacity;
    }
    strokes.push(s);
  }
  
  if (strokes.length === 0) return null;
  
  var result = {
    colors: strokes,
    weight: node.strokeWeight,
    align: node.strokeAlign
  };
  
  if ('strokeCap' in node && node.strokeCap !== 'NONE') {
    result.cap = node.strokeCap;
  }
  if ('strokeJoin' in node) {
    result.join = node.strokeJoin;
  }
  if ('dashPattern' in node && node.dashPattern && node.dashPattern.length > 0) {
    result.dashPattern = node.dashPattern;
  }
  
  return result;
}

function getEffects(node) {
  if (!('effects' in node) || !node.effects || node.effects.length === 0) return null;
  
  var effects = [];
  for (var i = 0; i < node.effects.length; i++) {
    var effect = node.effects[i];
    if (effect.visible === false) continue;
    
    var e = { type: effect.type };
    
    if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
      e.color = effect.color ? colorToRgba(effect.color, effect.color.a) : null;
      e.offset = { x: effect.offset.x, y: effect.offset.y };
      e.blur = effect.radius;
      if (effect.spread) e.spread = effect.spread;
    } else if (effect.type === 'LAYER_BLUR' || effect.type === 'BACKGROUND_BLUR') {
      e.blur = effect.radius;
    }
    
    effects.push(e);
  }
  
  return effects.length > 0 ? effects : null;
}

function getAutoLayout(node) {
  if (!('layoutMode' in node) || node.layoutMode === 'NONE') return null;
  
  var layout = {
    direction: node.layoutMode,
    gap: node.itemSpacing,
    padding: {
      top: node.paddingTop,
      right: node.paddingRight,
      bottom: node.paddingBottom,
      left: node.paddingLeft
    },
    counterAxisAlign: node.counterAxisAlignItems,
    primaryAxisAlign: node.primaryAxisAlignItems
  };
  
  if ('layoutWrap' in node && node.layoutWrap !== 'NO_WRAP') {
    layout.wrap = node.layoutWrap;
    if ('counterAxisSpacing' in node) {
      layout.counterAxisGap = node.counterAxisSpacing;
    }
  }
  
  if ('primaryAxisSizingMode' in node) {
    layout.primaryAxisSizing = node.primaryAxisSizingMode;
  }
  if ('counterAxisSizingMode' in node) {
    layout.counterAxisSizing = node.counterAxisSizingMode;
  }
  
  return layout;
}

function getConstraints(node) {
  if (!('constraints' in node)) return null;
  return {
    horizontal: node.constraints.horizontal,
    vertical: node.constraints.vertical
  };
}

function getLayoutSizing(node) {
  var sizing = {};
  if ('layoutSizingHorizontal' in node) {
    sizing.horizontal = node.layoutSizingHorizontal;
  }
  if ('layoutSizingVertical' in node) {
    sizing.vertical = node.layoutSizingVertical;
  }
  return (sizing.horizontal || sizing.vertical) ? sizing : null;
}

function getCornerRadius(node) {
  if ('cornerRadius' in node) {
    if (node.cornerRadius === figma.mixed) {
      return {
        topLeft: node.topLeftRadius,
        topRight: node.topRightRadius,
        bottomRight: node.bottomRightRadius,
        bottomLeft: node.bottomLeftRadius
      };
    } else if (node.cornerRadius > 0) {
      return node.cornerRadius;
    }
  }
  return null;
}

function getTextStyles(node) {
  if (node.type !== 'TEXT') return null;
  
  var text = {
    content: node.characters
  };
  
  // フォント
  if (node.fontName !== figma.mixed) {
    text.fontFamily = node.fontName.family;
    text.fontStyle = node.fontName.style;
  } else {
    text.fontFamily = 'mixed';
  }
  
  // サイズ
  text.fontSize = node.fontSize !== figma.mixed ? node.fontSize : 'mixed';
  
  // 行間
  if (node.lineHeight !== figma.mixed) {
    if (node.lineHeight.unit === 'AUTO') {
      text.lineHeight = 'auto';
    } else if (node.lineHeight.unit === 'PERCENT') {
      text.lineHeight = node.lineHeight.value + '%';
    } else {
      text.lineHeight = node.lineHeight.value;
    }
  }
  
  // 文字間隔
  if (node.letterSpacing !== figma.mixed) {
    if (node.letterSpacing.unit === 'PERCENT') {
      text.letterSpacing = node.letterSpacing.value + '%';
    } else {
      text.letterSpacing = node.letterSpacing.value;
    }
  }
  
  // 配置
  text.textAlignHorizontal = node.textAlignHorizontal;
  text.textAlignVertical = node.textAlignVertical;
  
  // テキスト装飾
  if (node.textDecoration !== figma.mixed && node.textDecoration !== 'NONE') {
    text.textDecoration = node.textDecoration;
  }
  
  // テキストケース
  if (node.textCase !== figma.mixed && node.textCase !== 'ORIGINAL') {
    text.textCase = node.textCase;
  }
  
  // 段落間隔
  if ('paragraphSpacing' in node && node.paragraphSpacing > 0) {
    text.paragraphSpacing = node.paragraphSpacing;
  }
  
  return text;
}

function getNodeDetails(node) {
  var d = {
    name: node.name,
    type: node.type
  };
  
  // 可視性
  if (!node.visible) {
    d.visible = false;
  }
  
  // ロック
  if (node.locked) {
    d.locked = true;
  }
  
  // サイズ
  if ('width' in node && 'height' in node) {
    d.width = Math.round(node.width * 100) / 100;
    d.height = Math.round(node.height * 100) / 100;
  }
  
  // 位置
  if ('x' in node && 'y' in node) {
    d.x = Math.round(node.x * 100) / 100;
    d.y = Math.round(node.y * 100) / 100;
  }
  
  // 回転
  if ('rotation' in node && node.rotation !== 0) {
    d.rotation = Math.round(node.rotation * 100) / 100;
  }
  
  // 不透明度
  if ('opacity' in node && node.opacity !== 1) {
    d.opacity = Math.round(node.opacity * 100) / 100;
  }
  
  // ブレンドモード
  if ('blendMode' in node && node.blendMode !== 'NORMAL' && node.blendMode !== 'PASS_THROUGH') {
    d.blendMode = node.blendMode;
  }
  
  // 角丸
  var radius = getCornerRadius(node);
  if (radius) d.cornerRadius = radius;
  
  // クリッピング
  if ('clipsContent' in node && node.clipsContent) {
    d.clipsContent = true;
  }
  
  // Constraints
  var constraints = getConstraints(node);
  if (constraints) d.constraints = constraints;
  
  // Layout Sizing (Fill, Hug, Fixed)
  var layoutSizing = getLayoutSizing(node);
  if (layoutSizing) d.layoutSizing = layoutSizing;
  
  // 塗りつぶし
  var fills = getFills(node);
  if (fills) d.fills = fills;
  
  // ストローク
  var strokes = getStrokes(node);
  if (strokes) d.strokes = strokes;
  
  // エフェクト
  var effects = getEffects(node);
  if (effects) d.effects = effects;
  
  // Auto Layout
  var autoLayout = getAutoLayout(node);
  if (autoLayout) d.autoLayout = autoLayout;
  
  // テキスト
  var textStyles = getTextStyles(node);
  if (textStyles) d.text = textStyles;
  
  // コンポーネント情報
  if (node.type === 'INSTANCE') {
    var main = node.mainComponent;
    if (main) {
      d.componentName = main.name;
      if (main.parent && main.parent.type === 'COMPONENT_SET') {
        d.componentSet = main.parent.name;
      }
    }
  }
  
  if (node.type === 'COMPONENT') {
    d.componentId = node.id;
  }
  
  // 子要素
  if ('children' in node && node.children.length > 0) {
    d.children = [];
    for (var j = node.children.length - 1; j >= 0; j--) {
      d.children.push(getNodeDetails(node.children[j]));
    }
  }
  
  return d;
}

// =====================
// UI通信
// =====================
figma.showUI(__html__, { width: 450, height: 550 });

figma.ui.onmessage = function(msg) {
  if (msg.type === 'export') {
    var selection = figma.currentPage.selection;
    
    if (selection.length === 0) {
      figma.ui.postMessage({ type: 'error', message: 'Select a layer' });
      return;
    }

    var output = '';
    for (var i = 0; i < selection.length; i++) {
      output += getRootNodeInfo(selection[i]);
      if (i < selection.length - 1) output += '\n';
    }

    figma.ui.postMessage({ type: 'result', data: output.trim() });
  }

  if (msg.type === 'export-page') {
    var children = figma.currentPage.children;
    var output = figma.currentPage.name + ' (PAGE)\n';
    
    for (var i = children.length - 1; i >= 0; i--) {
      var isLast = (i === 0);
      output += getNodeInfo(children[i], '', isLast);
    }

    figma.ui.postMessage({ type: 'result', data: output.trim() });
  }

  if (msg.type === 'export-json') {
    var selection = figma.currentPage.selection;
    
    if (selection.length === 0) {
      figma.ui.postMessage({ type: 'error', message: 'Select a layer' });
      return;
    }

    var details = [];
    for (var i = 0; i < selection.length; i++) {
      details.push(getNodeDetails(selection[i]));
    }

    var output = JSON.stringify(details.length === 1 ? details[0] : details, null, 2);
    figma.ui.postMessage({ type: 'result', data: output });
  }

  if (msg.type === 'export-both') {
    var selection = figma.currentPage.selection;
    
    if (selection.length === 0) {
      figma.ui.postMessage({ type: 'error', message: 'Select a layer' });
      return;
    }

    var treeOutput = '';
    for (var i = 0; i < selection.length; i++) {
      treeOutput += getRootNodeInfo(selection[i]);
      if (i < selection.length - 1) treeOutput += '\n';
    }

    var details = [];
    for (var i = 0; i < selection.length; i++) {
      details.push(getNodeDetails(selection[i]));
    }
    var jsonOutput = JSON.stringify(details.length === 1 ? details[0] : details, null, 2);

    figma.ui.postMessage({
      type: 'result-both',
      tree: treeOutput.trim(),
      json: jsonOutput
    });
  }

  if (msg.type === 'export-both-page') {
    var children = figma.currentPage.children;
    
    var treeOutput = figma.currentPage.name + ' (PAGE)\n';
    for (var i = children.length - 1; i >= 0; i--) {
      var isLast = (i === 0);
      treeOutput += getNodeInfo(children[i], '', isLast);
    }

    var details = {
      name: figma.currentPage.name,
      type: 'PAGE',
      children: []
    };
    for (var i = children.length - 1; i >= 0; i--) {
      details.children.push(getNodeDetails(children[i]));
    }
    var jsonOutput = JSON.stringify(details, null, 2);

    figma.ui.postMessage({
      type: 'result-both',
      tree: treeOutput.trim(),
      json: jsonOutput
    });
  }

  if (msg.type === 'cancel') {
    figma.closePlugin();
  }
};
