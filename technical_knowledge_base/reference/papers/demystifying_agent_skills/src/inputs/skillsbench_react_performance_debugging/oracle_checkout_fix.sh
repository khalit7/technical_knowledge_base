}
EOF

# Fix 3: Parallel fetches in checkout - start profile immediately after user
cat > src/app/api/checkout/route.ts << 'EOF'
import { NextRequest, NextResponse } from 'next/server';
import { fetchUserFromService, fetchConfigFromService, fetchProfileFromService } from '@/services/api-client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const userPromise = fetchUserFromService();
  const configPromise = fetchConfigFromService();
  const profilePromise = userPromise.then(user => fetchProfileFromService(user.id));

  const [user, config, profile] = await Promise.all([userPromise, configPromise, profilePromise]);

  return NextResponse.json({
    success: true,
    user: { id: user.id, name: user.name },
    profile,
