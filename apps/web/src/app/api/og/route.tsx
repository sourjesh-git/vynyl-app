import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const rawCode = searchParams.get('code');
  const code = rawCode ? rawCode.toUpperCase().trim() : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px 56px',
          backgroundColor: '#0A0A0E',
          color: '#FFFFFF',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
        }}
      >
        {/* Subtle Ambient Radial Glow */}
        <div
          style={{
            position: 'absolute',
            top: '-150px',
            right: '-150px',
            width: '650px',
            height: '650px',
            borderRadius: '50%',
            backgroundColor: 'rgba(224, 122, 95, 0.14)',
            filter: 'blur(110px)',
          }}
        />

        {/* Top Header Row */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            zIndex: 10,
          }}
        >
          {/* Logo Branding - Concentric Vinyl Rings */}
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: '1.5px solid rgba(255, 255, 255, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  border: '1.5px solid rgba(255, 255, 255, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    border: '1.5px solid rgba(255, 255, 255, 0.45)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <div
                    style={{
                      width: '4px',
                      height: '4px',
                      borderRadius: '50%',
                      backgroundColor: '#FFFFFF',
                    }}
                  />
                </div>
              </div>
            </div>
            <span
              style={{
                fontSize: '28px',
                fontWeight: 800,
                letterSpacing: '-1px',
                color: '#FFFFFF',
              }}
            >
              vynyl
            </span>
          </div>

          {/* Top Right Badges */}
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                backgroundColor: '#C7D1C0',
                color: '#1B1B1B',
                padding: '6px 18px',
                borderRadius: '100px',
                fontSize: '13px',
                fontWeight: 700,
                letterSpacing: '1px',
                textTransform: 'uppercase',
              }}
            >
              100% Free
            </div>
            <div
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                color: 'rgba(255, 255, 255, 0.85)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                padding: '6px 18px',
                borderRadius: '100px',
                fontSize: '13px',
                fontWeight: 600,
              }}
            >
              No login required
            </div>
          </div>
        </div>

        {/* Center Card Container */}
        {code ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '24px',
              padding: '44px 48px',
              gap: '20px',
              zIndex: 10,
            }}
          >
            {/* Tag line */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: '8px',
                fontSize: '13px',
                fontWeight: 800,
                letterSpacing: '2.5px',
                color: '#E07A5F',
                textTransform: 'uppercase',
              }}
            >
              SHARED LISTENING ROOM INVITATION
            </div>

            {/* Room Title & Code Pill Row */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: '20px',
                width: '100%',
              }}
            >
              <span
                style={{
                  fontSize: '52px',
                  fontWeight: 800,
                  letterSpacing: '-1px',
                  color: '#FFFFFF',
                  whiteSpace: 'nowrap',
                }}
              >
                Join Room
              </span>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#E07A5F',
                  color: '#1B1B1B',
                  padding: '8px 26px',
                  borderRadius: '16px',
                  fontWeight: 800,
                  fontSize: '48px',
                  letterSpacing: '4px',
                  fontFamily: 'monospace',
                }}
              >
                {code}
              </div>
            </div>

            {/* Subhead description */}
            <div
              style={{
                display: 'flex',
                fontSize: '21px',
                color: 'rgba(255, 255, 255, 0.75)',
                lineHeight: 1.5,
                maxWidth: '960px',
              }}
            >
              Listen together in perfect sync. Drop tracks into the queue, choose what plays next, and enjoy a seamless listening experience with your friends, all without an account.
            </div>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              width: '100%',
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '24px',
              padding: '48px 52px',
              gap: '20px',
              zIndex: 10,
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                gap: '12px',
                fontSize: '58px',
                fontWeight: 800,
                letterSpacing: '-2px',
                lineHeight: 1.15,
                color: '#FFFFFF',
              }}
            >
              <span>Listen to music,</span>
              <span style={{ color: '#E07A5F', fontStyle: 'italic', fontWeight: 400 }}>
                together.
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: '22px',
                color: 'rgba(255, 255, 255, 0.75)',
                lineHeight: 1.5,
                maxWidth: '920px',
              }}
            >
              Collaborative, real-time synchronized music rooms. Create a room, invite your friends, and jam together in sync.
            </div>
          </div>
        )}

        {/* Bottom Feature Badges Bar */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            paddingTop: '20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E07A5F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.85)' }}>
              Real-time sync
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E07A5F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <span style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.85)' }}>
              Works anywhere
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E07A5F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.85)' }}>
              No login
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E07A5F" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span style={{ fontSize: '15px', fontWeight: 600, color: 'rgba(255, 255, 255, 0.85)' }}>
              100% Free
            </span>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
