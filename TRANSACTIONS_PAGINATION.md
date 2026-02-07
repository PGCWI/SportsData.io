# Transactions Pagination & Player Links

## Overview
Updated the transactions column on the home page to display 25 transactions at a time with pagination controls, and added clickable player name links.

## Features Implemented

### 1. Pagination (25 per page)
- **Default**: Shows first 25 most recent transactions
- **Navigation**: Previous/Next buttons to browse through all transactions
- **Page Info**: Shows "Showing X-Y of Z" to indicate position
- **Smooth Navigation**: Click buttons to load next/previous page

### 2. Player Name Links
- **Clickable Names**: Player names are now hyperlinks
- **Direct Navigation**: Click to go to player detail page
- **Context Preserved**: Links include team index for proper back navigation
- **Fallback**: If no player ID, name displays as plain text

### 3. Smart Display Logic
- **Most Recent First**: Transactions sorted by date (newest at top)
- **25 Per Page**: Manageable number of items per view
- **Total Available**: All 30 days of transactions loaded, paginated for display

## Technical Implementation

### JavaScript Changes (`public/js/app.js`)

#### Variables Added
```javascript
let currentTxPage = 0;           // Track current page
const TX_PER_PAGE = 25;          // Items per page
let allTransactions = [];        // Store all transactions
```

#### Updated `renderTransactionsColumn()`
- Added `page` parameter (default 0)
- Calculates `startIdx` and `endIdx` for current page
- Slices transactions array for current page
- Generates player links with PlayerID
- Adds pagination controls at bottom

#### Global Pagination Function
```javascript
window.loadTxPage = function(page) {
  // Reloads transaction column with new page
}
```

### CSS Changes (`public/css/style.css`)

#### Player Link Styling
```css
.tx-player-link {
  color: var(--accent);
  font-weight: 600;
  text-decoration: none;
}
```

#### Pagination Controls
- `.tx-pagination` - Container with flexbox layout
- `.tx-page-btn` - Previous/Next buttons with hover effects
- `.tx-page-info` - Page counter display

## User Interface

### Pagination Controls
```
[← Previous]  Showing 1-25 of 150  [Next →]
```

- **Previous Button**: Appears when not on first page
- **Next Button**: Appears when more transactions available
- **Page Info**: Always shows current range and total

### Player Links
- **Blue colored** links for player names
- **Hover effect**: Underline on hover
- **Click action**: Navigates to player detail page
- **Back navigation**: Maintains team context

## Example Scenarios

### Page 1 (Default)
```
Showing 1-25 of 150        [Next →]
```
Shows most recent 25 transactions

### Page 2
```
[← Previous]  Showing 26-50 of 150  [Next →]
```
Shows transactions 26-50

### Last Page
```
[← Previous]  Showing 126-150 of 150
```
Shows remaining transactions

## Data Flow

1. **Load All Transactions**: Fetch all transactions from all leagues
2. **Sort by Date**: Newest first
3. **Store in Memory**: Keep full list for pagination
4. **Display Page**: Show 25 at a time
5. **Navigate**: Update display without reloading data

## Benefits

1. **Performance**: Loads all data once, paginate in browser
2. **User Experience**: Clean, manageable list of 25 items
3. **Full Access**: Can browse all transactions via pagination
4. **Quick Navigation**: Click player names to see details
5. **Context Awareness**: Links maintain team reference for back navigation

## Interaction Examples

### Clicking Player Name
```
User clicks "Patrick Mahomes" in transaction
→ Navigates to player.html?league=nfl&playerId=12345&teamIndex=5
→ Can click back to return to team page
```

### Using Pagination
```
User on page 1 → Clicks "Next →"
→ Loads page 2 (transactions 26-50)
→ Can click "← Previous" to go back
```

## Edge Cases Handled

- **No Transactions**: Shows "No transactions" message
- **Less than 25**: No pagination controls shown
- **No Player ID**: Name displays as plain text (not clickable)
- **Invalid Team Index**: Player link works without team context
- **Empty Team Logo**: Placeholder shown instead

## Future Enhancements

Potential improvements:
- Filter by league
- Filter by transaction type (Signed, Traded, Released, etc.)
- Search by player name
- Jump to specific page
- Date range filtering
