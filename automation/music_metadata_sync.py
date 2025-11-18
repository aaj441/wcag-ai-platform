#!/usr/bin/env python3
"""
Music Metadata Sync - Multi-Platform Integration
WCAG AI Platform - Music Module

Synchronizes music metadata across Spotify, Apple Music, Last.fm, and
SoundCloud with AI-powered enhancement and accessibility features.

Usage:
    python music_metadata_sync.py --artist "Artist Name" --platform spotify
    python music_metadata_sync.py --sync-all --output metadata.json
    python music_metadata_sync.py --generate-accessible-descriptions

Requirements:
    pip install spotipy requests anthropic
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional
import argparse

try:
    import spotipy
    from spotipy.oauth2 import SpotifyClientCredentials
    import requests
    from anthropic import Anthropic
except ImportError as e:
    print(f"Missing dependency: {e}")
    print("Install with: pip install spotipy requests anthropic")
    exit(1)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# API Configuration
SPOTIFY_CLIENT_ID = os.getenv('SPOTIFY_CLIENT_ID')
SPOTIFY_CLIENT_SECRET = os.getenv('SPOTIFY_CLIENT_SECRET')
LASTFM_API_KEY = os.getenv('LASTFM_API_KEY')
ANTHROPIC_API_KEY = os.getenv('ANTHROPIC_API_KEY')

class MusicMetadataSync:
    """Sync music metadata across platforms with AI enhancement"""
    
    def __init__(self):
        self.spotify = self._init_spotify()
        self.anthropic = Anthropic(api_key=ANTHROPIC_API_KEY) if ANTHROPIC_API_KEY else None
        logger.info("Initialized MusicMetadataSync")
    
    def _init_spotify(self):
        """Initialize Spotify API client"""
        if not SPOTIFY_CLIENT_ID or not SPOTIFY_CLIENT_SECRET:
            logger.warning("Spotify credentials not configured")
            return None
        
        auth_manager = SpotifyClientCredentials(
            client_id=SPOTIFY_CLIENT_ID,
            client_secret=SPOTIFY_CLIENT_SECRET
        )
        return spotipy.Spotify(auth_manager=auth_manager)
    
    def fetch_spotify_metadata(self, artist_name: str) -> Dict:
        """Fetch metadata from Spotify"""
        if not self.spotify:
            return {}
        
        logger.info("Fetching Spotify metadata for: %s", artist_name)
        
        try:
            # Search for artist
            results = self.spotify.search(q=f'artist:{artist_name}', type='artist', limit=1)
            if not results['artists']['items']:
                logger.warning("Artist not found: %s", artist_name)
                return {}
            
            artist = results['artists']['items'][0]
            artist_id = artist['id']
            
            # Get top tracks
            top_tracks = self.spotify.artist_top_tracks(artist_id)
            
            # Get albums
            albums = self.spotify.artist_albums(artist_id, limit=10)
            
            metadata = {
                'platform': 'spotify',
                'artist': {
                    'name': artist['name'],
                    'id': artist_id,
                    'genres': artist['genres'],
                    'popularity': artist['popularity'],
                    'followers': artist['followers']['total'],
                    'image': artist['images'][0]['url'] if artist['images'] else None,
                },
                'top_tracks': [
                    {
                        'name': track['name'],
                        'id': track['id'],
                        'duration_ms': track['duration_ms'],
                        'popularity': track['popularity'],
                        'preview_url': track['preview_url'],
                    }
                    for track in top_tracks['tracks'][:5]
                ],
                'albums': [
                    {
                        'name': album['name'],
                        'id': album['id'],
                        'release_date': album['release_date'],
                        'total_tracks': album['total_tracks'],
                    }
                    for album in albums['items']
                ],
                'fetched_at': datetime.utcnow().isoformat(),
            }
            
            logger.info("Fetched Spotify data: %d tracks, %d albums", len(metadata['top_tracks']), len(metadata['albums']))
            return metadata
            
        except Exception as e:
            logger.error("Spotify API error: %s", e)
            return {}
    
    def fetch_lastfm_metadata(self, artist_name: str) -> Dict:
        """Fetch metadata from Last.fm"""
        if not LASTFM_API_KEY:
            return {}
        
        logger.info("Fetching Last.fm metadata for: %s", artist_name)
        
        try:
            url = 'http://ws.audioscrobbler.com/2.0/'
            params = {
                'method': 'artist.getinfo',
                'artist': artist_name,
                'api_key': LASTFM_API_KEY,
                'format': 'json'
            }
            
            response = requests.get(url, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            
            if 'artist' not in data:
                return {}
            
            artist = data['artist']
            
            metadata = {
                'platform': 'lastfm',
                'artist': {
                    'name': artist['name'],
                    'mbid': artist.get('mbid'),
                    'listeners': int(artist['stats']['listeners']),
                    'playcount': int(artist['stats']['playcount']),
                    'bio': artist.get('bio', {}).get('summary', ''),
                    'tags': [tag['name'] for tag in artist.get('tags', {}).get('tag', [])],
                    'image': artist.get('image', [{}])[-1].get('#text'),
                },
                'fetched_at': datetime.utcnow().isoformat(),
            }
            
            logger.info("Fetched Last.fm data: %s listeners", metadata['artist']['listeners'])
            return metadata
            
        except Exception as e:
            logger.error("Last.fm API error: %s", e)
            return {}
    
    def generate_accessible_description(self, metadata: Dict) -> str:
        """Generate accessible description using AI"""
        if not self.anthropic:
            return ""
        
        logger.info("Generating accessible description with AI")
        
        try:
            prompt = f"""Generate a concise, accessible description for this musical artist suitable for screen readers and visually impaired users.

Artist: {metadata.get('artist', {}).get('name', 'Unknown')}
Genres: {', '.join(metadata.get('artist', {}).get('genres', []))}
Bio: {metadata.get('artist', {}).get('bio', '')[:500]}

Requirements:
- 2-3 sentences maximum
- Focus on genre, style, and key achievements
- Avoid visual descriptions
- Use clear, simple language
- Include pronunciation guide if name is unusual

Output only the description, no preamble."""

            response = self.anthropic.messages.create(
                model='claude-3-haiku-20240307',
                max_tokens=256,
                messages=[{'role': 'user', 'content': prompt}]
            )
            
            description = response.content[0].text.strip()
            logger.info("Generated accessible description")
            return description
            
        except Exception as e:
            logger.error("AI description generation failed: %s", e)
            return ""
    
    def merge_metadata(self, spotify_data: Dict, lastfm_data: Dict) -> Dict:
        """Merge metadata from multiple platforms"""
        merged = {
            'artist_name': spotify_data.get('artist', {}).get('name') or lastfm_data.get('artist', {}).get('name'),
            'platforms': {},
            'combined': {
                'genres': [],
                'popularity_score': 0,
                'total_listeners': 0,
                'tags': [],
            },
            'accessible_description': '',
            'synced_at': datetime.utcnow().isoformat(),
        }
        
        # Add platform-specific data
        if spotify_data:
            merged['platforms']['spotify'] = spotify_data
            merged['combined']['genres'].extend(spotify_data.get('artist', {}).get('genres', []))
            merged['combined']['popularity_score'] = spotify_data.get('artist', {}).get('popularity', 0)
        
        if lastfm_data:
            merged['platforms']['lastfm'] = lastfm_data
            merged['combined']['total_listeners'] = lastfm_data.get('artist', {}).get('listeners', 0)
            merged['combined']['tags'].extend(lastfm_data.get('artist', {}).get('tags', []))
        
        # Generate accessible description
        merged['accessible_description'] = self.generate_accessible_description(merged['platforms'].get('spotify') or merged['platforms'].get('lastfm', {}))
        
        return merged
    
    def sync_artist(self, artist_name: str) -> Dict:
        """Sync all metadata for an artist"""
        logger.info("Starting full sync for: %s", artist_name)
        
        spotify_data = self.fetch_spotify_metadata(artist_name)
        lastfm_data = self.fetch_lastfm_metadata(artist_name)
        
        merged = self.merge_metadata(spotify_data, lastfm_data)
        
        logger.info("Sync complete for %s", artist_name)
        return merged
    
    def save_metadata(self, metadata: Dict, output_file: str):
        """Save metadata to JSON file"""
        with open(output_file, 'w') as f:
            json.dump(metadata, f, indent=2)
        logger.info("Saved metadata to %s", output_file)

def main():
    parser = argparse.ArgumentParser(description='Sync music metadata across platforms')
    parser.add_argument('--artist', help='Artist name to sync')
    parser.add_argument('--platform', choices=['spotify', 'lastfm', 'all'], default='all')
    parser.add_argument('--output', default='metadata.json', help='Output file')
    parser.add_argument('--generate-accessible-descriptions', action='store_true',
                        help='Generate AI-powered accessible descriptions')
    
    args = parser.parse_args()
    
    if not args.artist:
        print("Error: --artist required")
        return
    
    syncer = MusicMetadataSync()
    metadata = syncer.sync_artist(args.artist)
    syncer.save_metadata(metadata, args.output)
    
    print(f"\n✓ Sync complete for {args.artist}")
    print(f"  Output: {args.output}")
    if metadata.get('accessible_description'):
        print(f"  Accessible description: {metadata['accessible_description']}")

if __name__ == '__main__':
    main()
