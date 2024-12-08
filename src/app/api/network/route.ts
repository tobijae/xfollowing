import { TwitterApi } from 'twitter-api-v2';
import { NextResponse } from 'next/server';

const client = new TwitterApi(process.env.TWITTER_BEARER_TOKEN || '');

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');

  if (!username) {
    return NextResponse.json(
      { error: 'Username is required' },
      { status: 400 }
    );
  }

  try {
    // Get user ID from username
    const user = await client.v2.userByUsername(username);
    if (!user.data) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get following list
    const following = await client.v2.following(user.data.id, {
      max_results: 100,
    });

    // Get followers
    const followers = await client.v2.followers(user.data.id, {
      max_results: 100,
    });

    // Combine and format the data
    const nodes = [
      {
        id: user.data.id,
        name: `@${username}`,
        type: 'main',
      },
      ...following.data.map(f => ({
        id: f.id,
        name: `@${f.username}`,
        type: 'following',
      })),
      ...followers.data.map(f => ({
        id: f.id,
        name: `@${f.username}`,
        type: 'follower',
      })),
    ];

    const links = [
      ...following.data.map(f => ({
        source: user.data.id,
        target: f.id,
        type: 'following',
      })),
      ...followers.data.map(f => ({
        source: f.id,
        target: user.data.id,
        type: 'follower',
      })),
    ];

    return NextResponse.json({ nodes, links });
  } catch (error: any) {
    console.error('Error fetching network data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch network data' },
      { status: 500 }
    );
  }
}