// RSS feed functionality has been replaced with daily check feature for app store compliance.
// This endpoint now returns an empty array to avoid content aggregation.

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=1800, stale-while-revalidate');

  res.status(200).json({
    success: true,
    message: 'RSS feed functionality has been replaced with daily check feature for app store compliance.',
    items: [],
    source: 'disabled',
    fetchedAt: new Date().toISOString(),
  });
}