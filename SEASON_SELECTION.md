# Intelligent Season Selection Implementation

## Overview
The system now intelligently determines which season data to fetch and display based on the current season type, avoiding unnecessary API calls for playoff data that doesn't exist yet.

## Smart Season Logic

### NFL
- **Regular Season (REG)**: 
  - Fetches: Current regular season only
  - Default View: Regular season
  - No playoff data fetched (playoffs haven't happened yet)
  
- **Playoffs (POST)**:
  - Fetches: Current regular season + Current playoffs
  - Default View: Playoffs
  - Both available for toggle

- **Offseason (OFF)**:
  - Fetches: Next season regular + Last year's playoffs
  - Default View: Last year's playoffs (most recent completed)
  - Can toggle to see next season's regular season

### NBA, NHL, MLB
- **Regular Season (REG)**:
  - Fetches: Current regular season + Last year's playoffs
  - Default View: Current regular season
  - Can toggle to see last year's playoffs

- **Playoffs (POST)**:
  - Fetches: Current regular season + Current playoffs
  - Default View: Current playoffs
  - Can toggle back to regular season

- **Offseason (OFF)**:
  - Fetches: Last year's regular season + Last year's playoffs
  - Default View: Last year's playoffs (most recent completed)
  - Can toggle to see last year's regular season

## Key Features

### 1. Conditional Playoff Fetching
```javascript
if (postParam && shouldFetchPost) {
  // Only fetch if playoffs exist or make sense
}
```

Benefits:
- ✅ Saves API calls during regular season
- ✅ Avoids 404 errors for non-existent playoff data
- ✅ Faster data fetching

### 2. Smart Default View
The `defaultView` is set based on what's most relevant:
- **Offseason**: Last year's playoffs (most recent completed season)
- **Regular Season**: Current regular season (what's happening now)
- **Playoffs**: Current playoffs (what's happening now)

### 3. Toggle Capability
Users can always toggle between regular and playoff views when both are available:
- Frontend loads both `standings_reg.json` and `standings_post.json`
- `standings_meta.json` contains `defaultView` to set initial view
- Toggle pills allow switching between views

## API Endpoint Usage

### NFL
- **Current/Upcoming Season**: Uses `UpcomingSeason` endpoint
  - Returns current season if in-season
  - Returns next season if offseason
- **Standings**: Uses year format (e.g., `2025`, `2025POST`)

### NBA/NHL/MLB
- **Current Season**: Uses `CurrentSeason` endpoint
  - Returns calendar year where majority of season falls
- **Standings**: Uses year+type format (e.g., `2025REG`, `2025POST`)

## Example Scenarios

### MLB in February (Offseason)
```
Season Type: OFF
Fetches:
  - 2024REG (last year's regular season)
  - 2024POST (last year's playoffs) ✓
Default: 2024POST (most recent completed)
Toggle: Can view 2024REG
```

### NBA in January (Regular Season)
```
Season Type: REG
Fetches:
  - 2025REG (current regular season) ✓
  - 2024POST (last year's playoffs)
Default: 2025REG (what's happening now)
Toggle: Can view 2024POST
```

### NFL in January (Playoffs)
```
Season Type: POST
Fetches:
  - 2025 (current regular season)
  - 2025POST (current playoffs) ✓
Default: 2025POST (what's happening now)
Toggle: Can view 2025 regular
```

### NHL in July (Offseason)
```
Season Type: OFF
Fetches:
  - 2024REG (last completed regular season)
  - 2024POST (last completed playoffs) ✓
Default: 2024POST (most recent completed)
Toggle: Can view 2024REG
```

## Benefits

1. **Efficiency**: Only fetches data that exists
2. **Relevance**: Shows most relevant data by default
3. **Flexibility**: Users can toggle to see other views
4. **Error Prevention**: Avoids API errors for non-existent data
5. **User Experience**: Automatically shows what users want to see

## Files Modified

- `backend/fetch-data.js`:
  - Added `shouldFetchPost` flag to `determineStandingsParams()`
  - Conditional playoff fetching based on flag
  - NFL uses `UpcomingSeason` endpoint

- `backend/server.js`:
  - Same intelligent logic for server startup refresh
  - Consistent behavior across fetch and server

## Testing Recommendations

1. **During Regular Season**: Verify no playoff data is fetched for current year
2. **During Playoffs**: Verify both regular and playoff data available
3. **During Offseason**: Verify last year's playoffs shown as default
4. **Toggle Functionality**: Verify toggle works when both views available
5. **Empty Playoffs**: Verify graceful handling when playoff data doesn't exist
