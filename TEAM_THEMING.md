# Team Color Theming Implementation

## Overview
Implemented dynamic team color theming for both team detail pages and player pages. Each page now uses the team's official colors (secondary and tertiary) to create a comfortable, branded experience.

## Features

### Color Selection Logic
- **Primary Theme Color**: Uses team's `SecondaryColor` as the main accent
- **Secondary Theme Color**: Uses team's `TertiaryColor` as the secondary accent
- **Fallback**: If secondary/tertiary aren't available, uses `PrimaryColor`

### Smart Contrast Detection
- Automatically calculates luminance of team colors
- Adjusts text colors for readability (light backgrounds = dark text, dark backgrounds = light text)
- Uses WCAG luminance formula for accurate color perception

### CSS Variable System
Dynamic CSS variables are set at runtime:
- `--team-primary`: Main team color
- `--team-primary-rgb`: RGB values for transparency effects
- `--team-primary-light`: 10% opacity version for backgrounds
- `--team-primary-medium`: 15% opacity version for hover states
- `--team-accent`: Secondary team color
- `--team-accent-rgb`: RGB values for accent transparency
- `--team-accent-light`: 8% opacity for subtle highlights
- `--team-text`: Contrasting text color (white or dark)

## Styled Components

### Team Page
1. **Team Banner**
   - Light background tint using team color
   - League badge uses team primary color
   - Section headers in team color

2. **Roster Cards**
   - Background tinted with team color
   - Hover state intensifies team color
   - Player status/position text uses team color
   - Smooth shadow effects using team color

3. **Stadium Section**
   - Card backgrounds use accent color tint
   - Labels colored with team primary
   - Borders use team color

4. **Transactions Section**
   - Cards have team color left border
   - Background tinted with accent color
   - Player links use team primary color
   - Hover states use accent color

5. **Navigation**
   - Back link styled with team colors
   - Maintains consistency across pages

### Player Page
1. **Player Header**
   - Border uses team color
   - Metadata styled with team color

2. **Player Details Card**
   - Background tinted with team color
   - Section titles in team primary
   - Labels use team color with opacity
   - Links styled with team colors

3. **Back Navigation**
   - Returns to team page with proper team index
   - Maintains team color theme

## Technical Implementation

### JavaScript Functions

#### Color Utilities
```javascript
normalizeHex(hex)         // Validates and normalizes hex color
hexToRgb(hex)             // Converts hex to RGB object
getLuminance(rgb)         // Calculates relative luminance
isLightColor(hex)         // Determines if color is light/dark
```

#### Main Function
```javascript
applyTeamColors(team)     // Applies team colors to CSS variables
```

### Files Modified

1. **`public/js/team.js`**
   - Added color utility functions
   - Added `applyTeamColors()` function
   - Modified `renderBanner()` to call color application
   - Colors applied when team data loads

2. **`public/js/player.js`**
   - Added same color utility functions
   - Modified `loadPlayer()` to fetch team data
   - Finds player's team from teams.json
   - Applies team colors if team found

3. **`public/css/style.css`**
   - Added CSS custom properties for team colors
   - Added `.team-themed` class styles
   - Comprehensive theming for all components
   - Smooth transitions and hover effects

## Usage Examples

### Washington Wizards (Navy/Red)
- Secondary Color: `#E31837` (Red)
- Tertiary Color: `#C4CED4` (Silver)
- Creates warm, branded experience with red accents

### Boston Celtics (Green/White)
- Primary Color: `#007A33` (Green)
- Secondary Color: `#BA9653` (Gold)
- Professional green theme with gold highlights

### LA Lakers (Purple/Gold)
- Primary Color: `#552583` (Purple)
- Secondary Color: `#FDB927` (Gold)
- Iconic purple and gold combination

## Benefits

1. **Brand Consistency**: Each team page feels authentic to the team
2. **Improved UX**: Visual hierarchy using team colors
3. **Comfortable Reading**: Smart contrast ensures readability
4. **Professional Look**: Subtle color usage, not overwhelming
5. **Responsive Design**: Colors adapt to all screen sizes
6. **Performance**: CSS variables for efficient updates

## Fallback Behavior

If team colors are not available:
- Falls back to default blue theme
- Page remains functional and attractive
- No visual errors or broken styling

## Accessibility

- Luminance-based contrast calculation ensures readable text
- Minimum contrast ratios maintained
- Color is not the only indicator of information
- Works with browser zoom and high contrast modes

## Browser Support

- Modern browsers with CSS custom properties support
- Chrome, Firefox, Safari, Edge (recent versions)
- Graceful degradation for older browsers

## Future Enhancements

Potential improvements:
- Add gradient backgrounds using multiple team colors
- Team logo watermark in background
- Color-coordinated charts/graphs
- Dark mode with team colors
- Save user preference for color intensity
