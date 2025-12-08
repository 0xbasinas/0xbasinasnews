import { Article } from '@/types/article';
import { XMLParser } from 'fast-xml-parser';

interface NewsSource {
  name: string;
  url: string;
}

const NEWS_SOURCES: NewsSource[] = [
  {
    name: 'The Hacker News',
    url: 'https://feeds.feedburner.com/TheHackersNews',
  },
  {
    name: 'Threatpost',
    url: 'https://threatpost.com/feed/',
  },
  {
    name: 'Security Affairs',
    url: 'https://securityaffairs.com/feed',
  },
  {
    name: 'InfoSec Magazine',
    url: 'https://www.infosecurity-magazine.com/rss/news/',
  },
  {
    name: 'Bleeping Computer',
    url: 'https://www.bleepingcomputer.com/feed/',
  },
];

// Configure XML parser
const parserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  parseAttributeValue: true,
  trimValues: true,
  parseTrueNumberOnly: false,
  arrayMode: false,
  ignoreNameSpace: true,
  removeNSPrefix: true,
  allowBooleanAttributes: true,
};

/**
 * Generate a unique ID for an article based on its URL
 * This creates a stable ID that remains consistent across fetches
 */
function generateArticleId(url: string, source: string): string {
  try {
    // Create a stable hash from the URL
    let hash = 0;
    const urlString = `${source}-${url}`;
    for (let i = 0; i < urlString.length; i++) {
      const char = urlString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    // Use absolute value and convert to base36 for shorter IDs
    return `${source}-${Math.abs(hash).toString(36)}`;
  } catch {
    // Fallback to a combination of source and URL
    const urlHash = url.replace(/[^a-zA-Z0-9]/g, '').substring(0, 30);
    return `${source}-${urlHash}`;
  }
}

/**
 * Check if URL is likely an image
 */
function isLikelyImageUrl(url: string): boolean {
  const urlLower = url.toLowerCase();
  
  // Check file extension
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico', '.tiff', '.tif'];
  const hasImageExtension = imageExtensions.some(ext => urlLower.includes(ext));
  if (hasImageExtension) return true;
  
  // Check common image hosts/CDNs
  const imageHosts = [
    'imgur', 'cloudinary', 'cdn', 'images', 'image', 'photo', 'pic', 
    'flickr', 'unsplash', 'pexels', 'pixabay', 'wp-content', 'media',
    'static', 'assets', 'uploads', 'thumbnail', 'thumb', 'avatar'
  ];
  const hasImageHost = imageHosts.some(host => urlLower.includes(host));
  if (hasImageHost) return true;
  
  // Check URL parameters that indicate images
  const imageParams = ['format=jpg', 'format=png', 'format=webp', 'format=gif', 'image', 'img', 'photo', 'picture'];
  const hasImageParam = imageParams.some(param => urlLower.includes(param));
  if (hasImageParam) return true;
  
  // Check path segments
  const imagePaths = ['/image/', '/img/', '/photo/', '/picture/', '/media/', '/uploads/'];
  const hasImagePath = imagePaths.some(path => urlLower.includes(path));
  if (hasImagePath) return true;
  
  // Reject common non-image URLs
  const nonImagePatterns = [
    '/feed', '/rss', '/atom', '.xml', '.json', '/api/', '/script',
    '.js', '.css', '.html', '.php', '.asp', '.aspx'
  ];
  const hasNonImagePattern = nonImagePatterns.some(pattern => urlLower.includes(pattern));
  if (hasNonImagePattern) return false;
  
  // If no clear indicators, be lenient but check URL structure
  // URLs with query params or paths that look like images
  if (urlLower.includes('?') || urlLower.match(/\/[^\/]+\.[a-z]{3,4}(\?|$)/)) {
    return true;
  }
  
  return false;
}

/**
 * Safely check if a URL is from WordPress.com CDN or contains wp-content in path
 * Prevents URL substring sanitization vulnerabilities
 */
function isWordPressUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    // Check if hostname ends with .wp.com (WordPress CDN)
    if (urlObj.hostname.endsWith('.wp.com')) {
      return true;
    }
    // Check if path contains /wp-content/ (self-hosted WordPress)
    if (urlObj.pathname.includes('/wp-content/')) {
      return true;
    }
    return false;
  } catch {
    // If URL parsing fails, return false to skip WordPress-specific processing
    return false;
  }
}

/**
 * Validate and normalize image URL
 */
function normalizeImageUrl(url: string, baseUrl?: string): string | null {
  if (!url || typeof url !== 'string') return null;
  
  // Clean up the URL
  let cleanUrl = url.trim();
  
  // Remove common prefixes/suffixes that might cause issues
  cleanUrl = cleanUrl.replace(/^[,\s]+|[,\s]+$/g, '');
  
  // Decode HTML entities safely (single-pass to avoid double-unescaping)
  cleanUrl = decodeHtmlEntities(cleanUrl);
  
  // Remove fragments
  cleanUrl = cleanUrl.split('#')[0];
  
  // Handle protocol-relative URLs
  if (cleanUrl.startsWith('//')) {
    cleanUrl = `https:${cleanUrl}`;
  } 
  // Handle relative URLs
  else if (cleanUrl.startsWith('/') && baseUrl) {
    try {
      const base = new URL(baseUrl);
      cleanUrl = `${base.protocol}//${base.host}${cleanUrl}`;
    } catch {
      return null;
    }
  } 
  // Handle relative URLs without leading slash
  else if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://') && baseUrl) {
    try {
      const base = new URL(baseUrl);
      // If it's a relative path, resolve it
      if (cleanUrl.includes('/')) {
        cleanUrl = new URL(cleanUrl, baseUrl).href;
      } else {
        // If it's just a filename, prepend the base URL path
        const basePath = base.pathname.substring(0, base.pathname.lastIndexOf('/') + 1);
        cleanUrl = `${base.protocol}//${base.host}${basePath}${cleanUrl}`;
      }
    } catch {
      return null;
    }
  }
  
  // Validate URL format
  try {
    const urlObj = new URL(cleanUrl);
    
    // Only allow http and https protocols
    if (urlObj.protocol !== 'http:' && urlObj.protocol !== 'https:') {
      return null;
    }
    
    // Check if it's likely an image
    if (!isLikelyImageUrl(cleanUrl)) {
      return null;
    }
    
    // Handle WordPress.com CDN (i0.wp.com, i1.wp.com, etc.)
    // WordPress.com CDN format: https://i0.wp.com/example.com/path/image.jpg?resize=...
    // The original URL is in the path after the domain
    let processedUrlObj = urlObj;
    if (urlObj.hostname.endsWith('.wp.com')) {
      // Extract the original site URL from the path
      // Path format: /example.com/path/image.jpg
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      if (pathParts.length > 1) {
        // The first part after the leading slash is the original domain
        const originalDomain = pathParts[0];
        // The rest is the path to the image
        const imagePath = '/' + pathParts.slice(1).join('/');
        
        // Construct the original URL (always use https for WordPress.com CDN originals)
        try {
          const originalUrl = new URL(`https://${originalDomain}${imagePath}`);
          // Remove all query parameters to get the original image
          originalUrl.search = '';
          processedUrlObj = originalUrl;
          cleanUrl = originalUrl.href;
        } catch {
          // If we can't construct the original URL, just remove query params from CDN URL
          processedUrlObj = urlObj;
          processedUrlObj.searchParams.delete('resize');
          processedUrlObj.searchParams.delete('ssl');
          processedUrlObj.searchParams.delete('w');
          processedUrlObj.searchParams.delete('h');
        }
      } else {
        // Fallback: just remove resize parameters
        processedUrlObj.searchParams.delete('resize');
        processedUrlObj.searchParams.delete('ssl');
        processedUrlObj.searchParams.delete('w');
        processedUrlObj.searchParams.delete('h');
      }
    }
    
    // Handle WordPress sites with resize parameters in URLs (Security Affairs pattern)
    // Remove resize parameters to get full-size images
    if (processedUrlObj.searchParams.has('resize')) {
      processedUrlObj.searchParams.delete('resize');
    }
    if (processedUrlObj.searchParams.has('ssl')) {
      processedUrlObj.searchParams.delete('ssl');
    }
    
    // Clean up the URL (remove tracking params, etc.)
    // Remove tracking and analytics parameters
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'fbclid', 'gclid', 'mc_cid', 'mc_eid', '_ga', '_gid'];
    trackingParams.forEach(param => {
      processedUrlObj.searchParams.delete(param);
    });
    
    // For WordPress sites, also remove size suffixes from path if present
    // Pattern: image-25-720x1024.png -> image-25.png (but only if we want full size)
    if (processedUrlObj.pathname.includes('/wp-content/uploads/')) {
      // Remove size suffixes like -720x1024, -1024x534, etc.
      processedUrlObj.pathname = processedUrlObj.pathname.replace(/-(\d+)x(\d+)(?=\.(jpg|jpeg|png|gif|webp|svg))/i, '');
      // Also remove -scaled suffix
      processedUrlObj.pathname = processedUrlObj.pathname.replace(/-scaled(?=\.(jpg|jpeg|png|gif|webp|svg))/i, '');
    }
    
    cleanUrl = processedUrlObj.href;
    
    return cleanUrl;
  } catch {
    return null;
  }
}

/**
 * Extract image URL from RSS item
 * Priority: enclosure > content:encoded (first large image) > media:thumbnail > media:content > others
 */
function extractImageUrl(item: any, source: string, articleUrl?: string, channelImage?: string): string {
  const baseUrl = articleUrl || '';
  
  // PRIORITY 1: Try enclosure (The Hacker News uses this with type="image/jpeg")
  if (item.enclosure) {
    const enclosure = Array.isArray(item.enclosure) ? item.enclosure[0] : item.enclosure;
    if (enclosure) {
      const url = enclosure['@_url'] || enclosure['url'];
      const type = enclosure['@_type'] || enclosure['type'] || '';
      // Enclosure with image type is high priority
      if (url && type.startsWith('image/')) {
        const normalized = normalizeImageUrl(url, baseUrl);
        if (normalized) return normalized;
      }
    }
  }
  
  // PRIORITY 2: Extract first large image from content:encoded (KrebsOnSecurity, WordPress sites)
  // This is where most images are in WordPress-based feeds
  const content = item['content:encoded'] || item.content || item.description || item.summary || '';
  let contentString = '';
  
  // Handle CDATA and object formats
  if (typeof content === 'string') {
    contentString = content;
  } else if (content && typeof content === 'object') {
    contentString = content['#cdata-section'] || content['#text'] || '';
  }
  
  if (contentString && contentString.length > 0) {
    // Extract all img tags with their attributes
    const imgTagPattern = /<img[^>]+>/gi;
    const imgTags = contentString.match(imgTagPattern);
    
    if (imgTags && imgTags.length > 0) {
      // Look for the first substantial image (not a small icon/thumbnail)
      for (const imgTag of imgTags) {
        // Extract src
        const srcMatch = imgTag.match(/src=["']([^"']+)["']/i);
        if (!srcMatch || !srcMatch[1]) continue;
        
        let imgUrl = srcMatch[1].trim();
        
        // Skip very small images (likely icons/avatars)
        const widthMatch = imgTag.match(/width=["']?(\d+)["']?/i);
        const heightMatch = imgTag.match(/height=["']?(\d+)["']?/i);
        if (widthMatch && heightMatch) {
          const width = parseInt(widthMatch[1], 10);
          const height = parseInt(heightMatch[1], 10);
          // Skip images smaller than 200x200 (likely thumbnails/icons)
          if (width < 200 && height < 200) continue;
        }
        
        // Skip avatar, icon, logo images
        const altMatch = imgTag.match(/alt=["']([^"']+)["']/i);
        const classMatch = imgTag.match(/class=["']([^"']+)["']/i);
        const altClass = ((altMatch ? altMatch[1] : '') + ' ' + (classMatch ? classMatch[1] : '')).toLowerCase();
        if (altClass.includes('avatar') || altClass.includes('icon') || altClass.includes('logo') || altClass.includes('thumbnail')) {
          continue;
        }
        
        // Handle srcset - take the largest image
        const srcsetMatch = imgTag.match(/srcset=["']([^"']+)["']/i);
        if (srcsetMatch && srcsetMatch[1]) {
          // srcset format: "url1 size1, url2 size2, ..." or "url1 size1w, url2 size2w"
          const srcsetParts = srcsetMatch[1].split(',').map(s => s.trim());
          let largestUrl = imgUrl;
          let largestSize = 0;
          
          // Parse each srcset entry to find the largest
          for (const part of srcsetParts) {
            const parts = part.trim().split(/\s+/);
            if (parts[0] && (parts[0].startsWith('http') || parts[0].startsWith('//'))) {
              const url = parts[0];
              // Check if there's a size specification (e.g., "1024w" or "1024")
              if (parts.length > 1) {
                const sizeMatch = parts[1].match(/(\d+)/);
                if (sizeMatch) {
                  const size = parseInt(sizeMatch[1], 10);
                  if (size > largestSize) {
                    largestSize = size;
                    largestUrl = url;
                  }
                }
              } else {
                // No size specified, prefer URLs without resize parameters
                if (!url.includes('resize=') && !url.includes('w=')) {
                  largestUrl = url;
                }
              }
            }
          }
          imgUrl = largestUrl;
        }
        
        // Clean up WordPress.com CDN URLs before normalizing
        // Security Affairs and other WordPress sites use i0.wp.com CDN
        if (isWordPressUrl(imgUrl)) {
          // Decode HTML entities in URL (using safe single-pass decoder)
          imgUrl = decodeHtmlEntities(imgUrl)
            .replace(/%2C/g, ',')
            .replace(/%2F/g, '/');
          
          // For WordPress.com CDN, prefer URLs without resize parameters
          // The normalizeImageUrl function will handle removing resize params
        }
        
        const normalized = normalizeImageUrl(imgUrl, baseUrl);
        if (normalized) return normalized;
      }
      
      // If no large image found after filtering, try the first image anyway
      const firstSrcMatch = imgTags[0].match(/src=["']([^"']+)["']/i);
      if (firstSrcMatch && firstSrcMatch[1]) {
        let firstImgUrl = firstSrcMatch[1].trim();
        // Clean WordPress URLs - remove size suffixes to get full-size
        if (isWordPressUrl(firstImgUrl)) {
          // Check if it's already a large image
          const sizeMatch = firstImgUrl.match(/-(\d+)x(\d+)\.(jpg|jpeg|png|gif|webp)/i);
          if (sizeMatch) {
            const width = parseInt(sizeMatch[1], 10);
            const height = parseInt(sizeMatch[2], 10);
            // If small, get full size; if large, keep it
            if (width < 600 && height < 600) {
              firstImgUrl = firstImgUrl.replace(/-\d+x\d+\.(jpg|jpeg|png|gif|webp)/i, '.$1');
            }
          } else {
            // No size suffix, might already be full size
            firstImgUrl = firstImgUrl.replace(/-\d+x\d+\.(jpg|jpeg|png|gif|webp)/i, '.$1');
          }
        }
        const normalized = normalizeImageUrl(firstImgUrl, baseUrl);
        if (normalized) return normalized;
      }
    }
    
    // Also try data-src and other lazy loading attributes
    const lazySrcPatterns = [
      /data-src=["']([^"']+)["']/gi,
      /data-lazy-src=["']([^"']+)["']/gi,
      /data-original=["']([^"']+)["']/gi,
    ];
    
    for (const pattern of lazySrcPatterns) {
      const matches = contentString.match(pattern);
      if (matches) {
        for (const match of matches) {
          const urlMatch = match.match(/=["']([^"']+)["']/i);
          if (urlMatch && urlMatch[1]) {
            let imgUrl = urlMatch[1].trim();
            if (isWordPressUrl(imgUrl)) {
              imgUrl = imgUrl.replace(/-\d+x\d+\.(jpg|jpeg|png|gif|webp)/i, '.$1');
            }
            const normalized = normalizeImageUrl(imgUrl, baseUrl);
            if (normalized) return normalized;
          }
        }
      }
    }
    
    // Try direct image URL pattern in content
    const directUrlPattern = /https?:\/\/[^\s<>"']+\.(jpg|jpeg|png|gif|webp)(\?[^\s<>"']*)?/gi;
    const urlMatches = contentString.match(directUrlPattern);
    if (urlMatches) {
      // Prefer larger images (check for size indicators in URL)
      for (const url of urlMatches) {
        // Skip thumbnails
        if (url.includes('thumb') || url.includes('thumbnail') || url.match(/-\d{1,2}x\d{1,2}\./)) {
          continue;
        }
        const normalized = normalizeImageUrl(url, baseUrl);
        if (normalized) return normalized;
      }
      // If no large image, use first match
      if (urlMatches[0]) {
        const normalized = normalizeImageUrl(urlMatches[0], baseUrl);
        if (normalized) return normalized;
      }
    }
  }
  
  // PRIORITY 3: Try media:thumbnail
  if (item['media:thumbnail']) {
    const thumb = Array.isArray(item['media:thumbnail']) 
      ? item['media:thumbnail'][0] 
      : item['media:thumbnail'];
    if (thumb) {
      const url = thumb['@_url'] || thumb['url'] || thumb['#text'];
      const normalized = normalizeImageUrl(url, baseUrl);
      if (normalized) return normalized;
    }
  }
  
  // PRIORITY 4: Try media:content (Threatpost uses this with multiple sizes)
  if (item['media:content']) {
    const mediaContents = Array.isArray(item['media:content']) 
      ? item['media:content'] 
      : [item['media:content']];
    
    // Sort by priority: prefer "full" > "large" > larger dimensions > others
    const prioritizedContents = mediaContents
      .map((mediaContent: any) => {
        const url = mediaContent['@_url'] || mediaContent['url'] || mediaContent['#text'];
        const type = mediaContent['@_type'] || mediaContent['type'] || '';
        const width = parseInt(mediaContent['@_width'] || mediaContent['width'] || '0', 10);
        const height = parseInt(mediaContent['@_height'] || mediaContent['height'] || '0', 10);
        const keywords = (mediaContent['media:keywords'] || mediaContent['keywords'] || '').toString().toLowerCase();
        
        // Skip if not an image
        if (url && (type.startsWith('image/') || isLikelyImageUrl(url))) {
          return {
            url,
            width,
            height,
            keywords,
            priority: keywords.includes('full') ? 1 : keywords.includes('large') ? 2 : width * height > 0 ? 3 : 4,
            area: width * height,
          };
        }
        return null;
      })
      .filter((item: any) => item !== null)
      .sort((a: any, b: any) => {
        // Sort by priority first, then by area (size)
        if (a.priority !== b.priority) return a.priority - b.priority;
        return b.area - a.area;
      });
    
    // Try the best image
    if (prioritizedContents.length > 0 && prioritizedContents[0]) {
      const normalized = normalizeImageUrl(prioritizedContents[0].url, baseUrl);
      if (normalized) return normalized;
    }
  }
  
  // PRIORITY 5: Try itunes:image
  if (item['itunes:image']) {
    const itunesImg = Array.isArray(item['itunes:image']) 
      ? item['itunes:image'][0] 
      : item['itunes:image'];
    if (itunesImg) {
      const url = itunesImg['@_href'] || itunesImg['href'] || itunesImg['#text'];
      const normalized = normalizeImageUrl(url, baseUrl);
      if (normalized) return normalized;
    }
  }
  
  // Try Atom feed media:group (more thorough)
  if (item['media:group']) {
    const mediaGroup = item['media:group'];
    
    // Try all media:thumbnail variations
    const thumbSources = [
      mediaGroup['media:thumbnail'],
      mediaGroup['media:thumbnails'],
      mediaGroup['thumbnail'],
    ];
    
    for (const thumbSource of thumbSources) {
      if (!thumbSource) continue;
      const thumb = Array.isArray(thumbSource) ? thumbSource[0] : thumbSource;
      if (thumb) {
        const url = thumb['@_url'] || thumb['url'] || thumb['@_href'] || thumb['href'] || thumb['#text'];
        if (url) {
          const normalized = normalizeImageUrl(url, baseUrl);
          if (normalized) return normalized;
        }
      }
    }
    
    // Try all media:content variations (prioritize by size)
    const contentSources = [
      mediaGroup['media:content'],
      mediaGroup['media:contents'],
      mediaGroup['content'],
    ];
    
    const allMediaContents: any[] = [];
    for (const contentSource of contentSources) {
      if (!contentSource) continue;
      const contents = Array.isArray(contentSource) ? contentSource : [contentSource];
      allMediaContents.push(...contents);
    }
    
    // Sort by size/priority
    const prioritizedMedia = allMediaContents
      .map((mediaContent: any) => {
        const url = mediaContent['@_url'] || mediaContent['url'] || mediaContent['@_href'] || mediaContent['href'];
        const type = mediaContent['@_type'] || mediaContent['type'] || '';
        const width = parseInt(mediaContent['@_width'] || mediaContent['width'] || '0', 10);
        const height = parseInt(mediaContent['@_height'] || mediaContent['height'] || '0', 10);
        
        if (url && (type.startsWith('image/') || isLikelyImageUrl(url))) {
          return {
            url,
            area: width * height,
          };
        }
        return null;
      })
      .filter((item: any) => item !== null)
      .sort((a: any, b: any) => b.area - a.area);
    
    if (prioritizedMedia.length > 0 && prioritizedMedia[0]) {
      const normalized = normalizeImageUrl(prioritizedMedia[0].url, baseUrl);
      if (normalized) return normalized;
    }
  }
  
  // PRIORITY 6: Try og:image or meta tags in content (common in some feeds)
  if (contentString && contentString.length > 0) {
    // Try multiple og:image patterns (more flexible matching)
    const ogImagePatterns = [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
      /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
      /<meta[^>]+property=["']og:image:secure_url["'][^>]+content=["']([^"']+)["']/i,
    ];
    
    for (const pattern of ogImagePatterns) {
      const match = contentString.match(pattern);
      if (match && match[1]) {
        const normalized = normalizeImageUrl(match[1], baseUrl);
        if (normalized) return normalized;
      }
    }
    
    const metaImageMatch = contentString.match(/<meta[^>]+name=["']image["'][^>]+content=["']([^"']+)["']/i);
    if (metaImageMatch && metaImageMatch[1]) {
      const normalized = normalizeImageUrl(metaImageMatch[1], baseUrl);
      if (normalized) return normalized;
    }
  }
  
  // PRIORITY 7: Source-specific fallbacks for feeds without images
  // For sources like InfoSec Magazine and SANS that don't include images in RSS
  // We can't fetch the article page directly (would be too slow), so we return empty
  // The component will show a placeholder icon instead
  // This is acceptable as these feeds don't provide images in their RSS
  
  // Try feed/channel image as fallback
  if (channelImage) {
    const normalized = normalizeImageUrl(channelImage, baseUrl);
    if (normalized) return normalized;
  }

  // Return empty string - we'll handle this in the component
  return '';
}

/**
 * Clean HTML from description
 */
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    nbsp: ' ',
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
  };

  return text.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity) => {
    const normalized = entity.toLowerCase();

    if (normalized.startsWith('#x')) {
      const codePoint = Number.parseInt(normalized.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }

    if (normalized.startsWith('#')) {
      const codePoint = Number.parseInt(normalized.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }

    return entities[normalized] ?? match;
  });
}

function cleanDescription(description: string): string {
  if (!description) return '';

  // Decode HTML entities first (once only)
  let cleaned = decodeHtmlEntities(description);
  
  // Remove HTML tags repeatedly until none remain
  // This prevents nested tags like <<script>> from becoming <script> after first pass
  let previousLength;
  do {
    previousLength = cleaned.length;
    cleaned = cleaned.replace(/<[^>]*>/g, '');
  } while (cleaned.length !== previousLength && cleaned.includes('<'));
  
  // DO NOT decode again after tag removal - this would recreate tags from entities like &lt;script&gt;
  return cleaned.trim().substring(0, 200); // Limit to 200 characters
}

/**
 * Extract channel/image URL from RSS feed
 */
function extractChannelImage(result: any): string | undefined {
  try {
    // RSS 2.0 format
    if (result.rss?.channel?.image?.url) {
      const url = result.rss.channel.image.url;
      return typeof url === 'string' ? url : (url['#text'] || url);
    }
    // Atom format
    if (result.feed?.icon) {
      return typeof result.feed.icon === 'string' ? result.feed.icon : result.feed.icon['#text'];
    }
    if (result.feed?.logo) {
      return typeof result.feed.logo === 'string' ? result.feed.logo : result.feed.logo['#text'];
    }
  } catch {
    // Ignore errors
  }
  return undefined;
}

/**
 * Normalize RSS item data
 */
function normalizeRssItem(item: any, source: string): Article | null {
  try {
    // Handle different RSS formats
    const title = item.title || item['title'] || '';
    const link = item.link || item['link'] || item.guid || item['guid'] || '';
    
    if (!title || !link) {
      return null;
    }

    // Get URL (link can be an object with #text or a string)
    // Atom feeds often have links as arrays of objects with @_href
    let url: string = '';
    if (typeof link === 'string') {
      url = link;
    } else if (Array.isArray(link)) {
      // Atom feeds: find the 'alternate' link or use the first one
      const alternateLink = link.find((l: any) => 
        l['@_rel'] === 'alternate' || l['rel'] === 'alternate' || !l['@_rel']
      );
      if (alternateLink) {
        url = typeof alternateLink === 'string' 
          ? alternateLink 
          : (alternateLink['@_href'] || alternateLink['href'] || alternateLink['#text'] || '');
      } else if (link[0]) {
        url = typeof link[0] === 'string' 
          ? link[0] 
          : (link[0]['@_href'] || link[0]['href'] || link[0]['#text'] || '');
      }
    } else if (link && typeof link === 'object') {
      url = link['@_href'] || link['href'] || link['#text'] || link['#cdata-section'] || '';
    }
    
    if (!url || typeof url !== 'string') {
      return null;
    }

    // Get description
    const description = item.description || item['description'] || item['content:encoded'] || item.summary || '';
    const cleanDesc = typeof description === 'string' 
      ? cleanDescription(description) 
      : cleanDescription(description?.['#text'] || description?.['#cdata-section'] || '');

    // Get publication date
    const pubDate = item.pubDate || item['pubDate'] || item.published || item['published'] || item['dc:date'] || item.updated || new Date().toISOString();
    const publishedDate = typeof pubDate === 'string' ? pubDate : (pubDate?.['#text'] || new Date().toISOString());

    return {
      id: generateArticleId(url, source),
      title: typeof title === 'string' ? title : (title['#text'] || title['#cdata-section'] || title),
      description: cleanDesc || 'No description available',
      url: url,
      source: source,
      publishedDate: publishedDate,
    };
  } catch (error) {
    console.error('Error normalizing RSS item:', error);
    return null;
  }
}

/**
 * CORS proxy URLs (with fallbacks)
 */
const CORS_PROXIES = [
  'https://api.allorigins.win/raw?url=',
  'https://corsproxy.io/?',
  'https://api.codetabs.com/v1/proxy?quest=',
];

/**
 * Fetch URL through CORS proxy with fallback
 */
async function fetchWithProxy(url: string, timeout = 15000, useProxy = true): Promise<string> {
  // Try direct fetch first (works for most feeds and is faster)
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const text = await response.text();
      // Verify it's valid XML/RSS
      if (text.trim().startsWith('<?xml') || text.trim().startsWith('<rss') || text.trim().startsWith('<feed') || text.trim().startsWith('<RDF')) {
        return text;
      }
      throw new Error('Invalid RSS feed format');
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error: any) {
    // If direct fetch fails and we should use proxy, try proxies
    if (useProxy) {
      const errorMessage = error?.message || '';
      const errorName = error?.name || '';
      const shouldUseProxy = 
        errorName === 'TypeError' || 
        errorName === 'AbortError' ||
        errorMessage.includes('CORS') || 
        errorMessage.includes('Network') ||
        errorMessage.includes('Failed to fetch') ||
        errorMessage.includes('Network request failed') ||
        !errorMessage.includes('HTTP');
      
      if (shouldUseProxy) {
        console.log(`Direct fetch failed for ${url}, trying CORS proxy...`);
        
        // Try each proxy in sequence
        for (const proxy of CORS_PROXIES) {
          try {
            const proxyUrl = `${proxy}${encodeURIComponent(url)}`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), timeout + 5000); // Extra time for proxy

            const response = await fetch(proxyUrl, {
              signal: controller.signal,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/rss+xml, application/xml, text/xml, */*',
              },
            });

            clearTimeout(timeoutId);

            if (response.ok) {
              let text = await response.text();
              
              // Some proxies wrap the response in JSON
              try {
                const json = JSON.parse(text);
                if (json.contents) {
                  text = json.contents;
                } else if (json.data) {
                  text = json.data;
                }
              } catch {
                // Not JSON, use as is
              }
              
              // Verify it's valid XML/RSS
              const trimmedText = text.trim();
              if (trimmedText.startsWith('<?xml') || 
                  trimmedText.startsWith('<rss') || 
                  trimmedText.startsWith('<feed') || 
                  trimmedText.startsWith('<RDF') ||
                  trimmedText.includes('<channel>') ||
                  trimmedText.includes('<entry>')) {
                console.log(`Successfully fetched via proxy: ${proxy.substring(0, 30)}...`);
                return text;
              }
            }
          } catch (proxyError: any) {
            console.log(`Proxy ${proxy.substring(0, 30)}... failed: ${proxyError?.message || 'unknown error'}`);
            continue;
          }
        }
      }
    }
    
    // If all proxies fail or proxy is disabled, throw the original error
    throw error;
  }
}

/**
 * Fetch articles from a single RSS feed with timeout
 */
async function fetchFeed(source: NewsSource, timeout = 15000): Promise<Article[]> {
  try {
    // Fetch RSS feed (with CORS proxy fallback)
    const xmlText = await fetchWithProxy(source.url, timeout, true);
    
    // Parse XML
    const xmlParser = new XMLParser(parserOptions);
    const result = xmlParser.parse(xmlText);

    // Handle different RSS formats (RSS 2.0, Atom, etc.)
    let items: any[] = [];
    
    if (result.rss && result.rss.channel && result.rss.channel.item) {
      items = Array.isArray(result.rss.channel.item) 
        ? result.rss.channel.item 
        : [result.rss.channel.item];
    } else if (result.feed && result.feed.entry) {
      // Atom format
      items = Array.isArray(result.feed.entry) 
        ? result.feed.entry 
        : [result.feed.entry];
    } else if (result['rdf:RDF'] && result['rdf:RDF'].item) {
      // RDF format
      items = Array.isArray(result['rdf:RDF'].item) 
        ? result['rdf:RDF'].item 
        : [result['rdf:RDF'].item];
    }

    if (!items || items.length === 0) {
      console.warn(`No items found in feed: ${source.name}`);
      return [];
    }

    // Normalize and filter items
    const articles: Article[] = [];
    for (const item of items.slice(0, 20)) { // Limit to 20 articles per source
      const article = normalizeRssItem(item, source.name);
      if (article) {
        articles.push(article);
      }
    }

    return articles;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error(`Timeout fetching feed from ${source.name}`);
    } else {
      console.error(`Error fetching feed from ${source.name}:`, error);
    }
    return [];
  }
}

/**
 * Fetch all articles from all news sources
 */
export async function fetchAllArticles(): Promise<Article[]> {
  try {
    const promises = NEWS_SOURCES.map((source) => fetchFeed(source));
    const results = await Promise.allSettled(promises);
    
    const allArticles: Article[] = [];
    const seenUrls = new Set<string>();
    
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        result.value.forEach((article) => {
          // Deduplicate by URL (case-insensitive)
          const urlKey = article.url.toLowerCase();
          if (!seenUrls.has(urlKey)) {
            seenUrls.add(urlKey);
            allArticles.push(article);
          }
        });
      }
    });

    // Sort by published date (newest first)
    return allArticles.sort((a, b) => {
      try {
        const dateA = new Date(a.publishedDate).getTime();
        const dateB = new Date(b.publishedDate).getTime();
        return dateB - dateA;
      } catch {
        return 0;
      }
    });
  } catch (error) {
    console.error('Error fetching all articles:', error);
    return [];
  }
}

/**
 * Get list of news sources
 */
export function getNewsSources(): string[] {
  return NEWS_SOURCES.map((source) => source.name);
}
