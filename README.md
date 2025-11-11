# Cybersecurity News Aggregator

A React Native app built with Expo that aggregates cybersecurity news from multiple sources and allows you to save articles for offline reading.

## Features

- **Multiple News Sources**: Fetches articles from 5 leading cybersecurity news sources:
  - The Hacker News
  - Threatpost
  - Security Affairs
  - InfoSec Magazine
  - Bleeping Computer

- **Article Cards**: Clean card-based UI displaying:
  - Article title and description
  - Publication date (with relative time)
  - Source badge
  - Like button to save articles
  - Link button to open articles in browser

- **Saved Articles**: 
  - Save articles with a tap of the heart button
  - All data stored locally using AsyncStorage
  - Works fully offline for saved articles
  - View all saved articles in a dedicated tab

- **Pull-to-Refresh**: Refresh news feed by pulling down

- **Offline Support**: Saved articles are available offline

- **Dark Mode**: Beautiful dark mode with purplish theme

## Prerequisites

- Node.js (v18 or later)
- pnpm (or npm/yarn)
- Expo CLI
- iOS Simulator (for iOS development) or Android Studio (for Android development)

## Installation

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

   Or if using npm:
   ```bash
   npm install
   ```

2. **Start the development server**:
   ```bash
   pnpm start
   ```

   Or:
   ```bash
   npm start
   ```

3. **Run on your device/simulator**:
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan the QR code with Expo Go app on your physical device

## Project Structure

```
├── app/
│   ├── (tabs)/
│   │   ├── index.tsx          # All News tab
│   │   ├── explore.tsx        # Saved Articles tab
│   │   └── _layout.tsx        # Tab navigation layout
│   └── _layout.tsx            # Root layout
├── components/
│   ├── ArticleCard.tsx        # Article card component
│   └── ...                    # Other UI components
├── services/
│   ├── rssService.ts          # RSS feed fetching service
│   └── storageService.ts      # AsyncStorage service for saved articles
├── types/
│   └── article.ts             # TypeScript types for articles
└── constants/
    └── theme.ts               # Theme colors and fonts
```

## Usage

### Viewing News

1. Open the app and navigate to the "All News" tab
2. Articles from all 5 sources are displayed in a unified feed
3. Pull down to refresh and get the latest articles
4. Tap on any article card to open it in your browser

### Saving Articles

1. Tap the heart icon on any article card to save it
2. The heart icon will turn red when the article is saved
3. Saved articles are stored locally on your device
4. Navigate to the "Saved" tab to view all saved articles

### Viewing Saved Articles

1. Navigate to the "Saved" tab
2. All your saved articles are displayed here
3. Tap the heart icon again to unsave an article
4. Saved articles work offline - no internet connection required

## Data Storage

Articles are saved locally using `@react-native-async-storage/async-storage`. The data structure includes:

```json
{
  "id": "unique_id",
  "title": "string",
  "description": "string",
  "url": "string",
  "source": "string",
  "publishedDate": "ISO date",
  "savedAt": "timestamp"
}
```

## Technical Details

### RSS Feeds

The app fetches RSS feeds from the following sources:
- All feeds are parsed using the `fast-xml-parser` library (React Native compatible)
- Each feed has a 15-second timeout to prevent hanging
- CORS proxy support with automatic fallback for restricted feeds
- HTML is cleaned from descriptions

### Error Handling

- Network errors are handled gracefully
- Failed feeds don't crash the app
- Loading states are shown during data fetching
- Error messages are displayed when feeds fail to load

### Performance

- Articles are limited to 20 per source to prevent overwhelming
- FlatList is used for efficient rendering of large lists
- Saved article IDs are cached for quick lookup
- CORS proxy fallback ensures reliable feed fetching

## Building for Production

### iOS

```bash
eas build --platform ios
```

### Android

```bash
eas build --platform android
```

For more information, see the [Expo documentation](https://docs.expo.dev/build/introduction/).

## Troubleshooting

### RSS Feeds Not Loading

- Check your internet connection
- Some RSS feeds may have CORS restrictions
- Try pulling to refresh
- Check the console for error messages

### Saved Articles Not Persisting

- Ensure AsyncStorage is working correctly
- Check device storage space
- Try restarting the app

## Dependencies

- `expo`: Expo framework
- `expo-router`: File-based routing
- `react-native`: React Native framework
- `@react-native-async-storage/async-storage`: Local storage
- `fast-xml-parser`: RSS/XML feed parsing (React Native compatible)
- `expo-haptics`: Haptic feedback
- `expo-web-browser`: Opening articles in browser

## License

This project is private and proprietary.

## Contributing

This is a private project. Contributions are not accepted at this time.
