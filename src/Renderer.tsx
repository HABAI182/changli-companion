import type { CSSProperties } from 'react';
import type { CharacterMachine, Expression, Settings } from './domain';
import { motions } from './domain';
import type { RenderSnapshot } from './pet/presentation';
// The renderers share this interaction boundary.
export interface RendererProps {
  machine: CharacterMachine;
  expression?: Expression;
  settings: Settings;
  progress: number;
  priority: string;
  onHead: () => void;
  onBody: () => void;
  onLamp: () => void;
  onScroll: () => void;
  snapshot?: RenderSnapshot;
}
export function LayeredRenderer({
  machine: m,
  expression,
  settings,
  progress,
  priority,
  onHead,
  onLamp,
  onScroll,
}: RendererProps) {
  const face = expression || motions[m.pose].expression;
  const closed = face === 'sleepy',
    smile = face === 'smile' || face === 'blush',
    think = face === 'think';
  const action = (fn: () => void) => ({
    role: 'button',
    tabIndex: 0,
    onClick: fn,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fn();
      }
    },
  });
  return (
    <svg
      className={`pet motion-${settings.motion} pose-${m.pose} face-${face}`}
      viewBox="0 0 360 320"
      aria-label="长离分层动作占位稿，点击头部互动、灯具专注、卷轴待办"
      style={
        {
          '--gaze-x': `${m.gaze.x * 3}px`,
          '--gaze-y': `${m.gaze.y * 2}px`,
          '--lamp': 0.25 + progress * 0.75,
          '--steps': settings.fps,
        } as CSSProperties
      }
    >
      <defs>
        <linearGradient id="hair" x1="0" y1="0" x2="0.35" y2="1">
          <stop stopColor="#faf0e8" />
          <stop offset=".42" stopColor="#f2d0ce" />
          <stop offset="1" stopColor="#d16c75" />
        </linearGradient>
        <linearGradient id="wood" x2="0" y2="1">
          <stop stopColor="#704944" />
          <stop offset="1" stopColor="#352d30" />
        </linearGradient>
        <radialGradient id="glow">
          <stop stopColor="#ffce71" stopOpacity=".55" />
          <stop offset="1" stopColor="#ffce71" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="182" cy="289" rx="145" ry="13" fill="#251b27" opacity=".1" />
      <g className="body-breathe" stroke="#613e46" strokeWidth="1.6" strokeLinejoin="round">
        <g id="back-hair" fill="url(#hair)">
          <path d="M127 58 Q79 99 90 178 Q92 206 76 224 Q117 223 126 193 Q115 225 145 227 L231 226 Q260 211 259 179 Q283 184 282 155 Q260 159 258 124 Q253 65 223 58Z" />
          <path className="hair-tip" d="M102 127 Q74 201 104 219 Q66 225 73 186 Q65 149 102 127Z" />
          <path className="hair-tip" d="M251 128 Q284 171 260 209 Q294 195 278 161Z" />
        </g>
        <g id="body">
          <path d="M150 179 L211 179 Q241 191 239 247 L123 247 Q121 198 150 179" fill="#eee2cb" />
          <path d="M155 181 L182 206 L211 181 L211 169 L155 169Z" fill="#ffe5d5" />
          <path d="M164 174 L163 184 L181 198 L198 185 L199 174 L183 182Z" fill="#34313a" />
          <path
            d="M145 191 L159 195 L176 243 L140 243Z M217 190 L204 195 L190 243 L230 243Z"
            fill="#332e35"
          />
          <path d="M159 195 L180 218 L207 193 M180 218 L180 244" stroke="#caa466" fill="none" />
          <path d="M181 206 L190 223 L181 238 L173 223Z" fill="#a64249" stroke="#cba36c" />
          <path
            d="M145 217 Q155 224 163 222 M202 222 Q213 224 222 215"
            fill="none"
            stroke="#c7a875"
          />
        </g>
        <g id="head" {...action(onHead)} aria-label="摸摸头" className="head-hit">
          <path
            d="M121 105 Q121 61 180 62 Q245 66 240 118 L233 147 Q218 178 182 182 Q143 177 129 152Z"
            fill="#ffe8d8"
          />
          <ellipse
            cx="137"
            cy="151"
            rx="10"
            ry="4"
            fill="#e8a4a0"
            opacity={face === 'blush' ? 0.85 : 0.3}
          />
          <ellipse
            cx="222"
            cy="151"
            rx="10"
            ry="4"
            fill="#e8a4a0"
            opacity={face === 'blush' ? 0.85 : 0.3}
          />
          <g
            className={closed ? 'eyes closed' : 'eyes'}
            stroke="#613e46"
            strokeWidth="2.5"
            fill="none"
          >
            {closed || smile ? (
              <>
                <path d="M142 137 Q150 130 160 137 M200 137 Q209 130 218 137" />
              </>
            ) : (
              <>
                <path
                  d={
                    think
                      ? 'M141 130 L162 133 M198 133 L219 130'
                      : 'M141 131 Q153 136 163 132 M197 132 Q210 136 220 130'
                  }
                />
                <g className="pupils" fill="#c2813c" strokeWidth="1">
                  <ellipse cx="153" cy="141" rx="6" ry={face === 'surprised' ? 9 : 7} />
                  <ellipse cx="208" cy="141" rx="6" ry={face === 'surprised' ? 9 : 7} />
                  <ellipse cx="154" cy="142" rx="2" ry="5" fill="#6c3235" />
                  <ellipse cx="207" cy="142" rx="2" ry="5" fill="#6c3235" />
                  <circle cx="151" cy="137" r="2" fill="white" stroke="none" />
                  <circle cx="206" cy="137" r="2" fill="white" stroke="none" />
                </g>
              </>
            )}
          </g>
          <path
            d={
              face === 'serious'
                ? 'M142 121 L162 125 M199 125 L218 120'
                : 'M141 121 Q151 117 162 121 M200 121 Q209 118 220 121'
            }
            fill="none"
            strokeWidth="2"
          />
          {face === 'surprised' ? (
            <ellipse cx="182" cy="161" rx="3" ry="5" fill="#a75e61" />
          ) : (
            <path
              d={
                smile
                  ? 'M172 157 Q183 169 193 156'
                  : face === 'resigned'
                    ? 'M175 162 L190 160'
                    : 'M176 160 Q182 163 189 159'
              }
              fill="none"
              strokeWidth="1.8"
            />
          )}
          <g id="front-hair" fill="url(#hair)">
            <path d="M114 113 Q105 68 136 53 Q167 32 197 52 Q234 42 251 77 Q264 103 244 141 L224 159 L234 104 Q214 100 204 72 Q203 105 182 124 L177 101 L160 124 L150 100 Q137 126 119 128 Q107 130 100 122 Q116 123 114 113Z" />
            <path
              d="M148 66 Q125 85 134 119 M173 58 Q162 75 163 100 M193 60 Q182 83 181 111 M215 65 Q223 94 243 107"
              fill="none"
              stroke="#c68a94"
              strokeWidth="1"
            />
          </g>
          <g id="ribbon">
            <path
              d="M210 57 L232 33 L243 60 L274 52 L259 77 L237 74 L253 109 L231 99Z"
              fill="#f9eee2"
            />
            <path d="M232 59 L224 73 L243 81 L249 65Z" fill="#303037" />
            <path d="M248 76 L272 113 L254 108 L241 80Z" fill="#b64b56" stroke="#bd9657" />
          </g>
          <g fill="none" stroke="#c2954e" strokeWidth="3">
            <path d="M124 80 C108 56 143 62 124 80 C104 87 111 105 124 88 C139 101 143 83 124 80Z" />
            <path d="M225 84 C207 62 238 64 225 84 C208 91 222 106 229 91 C246 96 241 80 225 84Z" />
          </g>
          <g fill="#e7c484" stroke="#aa7a42">
            <circle cx="124" cy="83" r="3" />
            <circle cx="227" cy="86" r="3" />
            <path d="M119 91 L115 108 L119 112 L122 107Z M233 94 L237 110 L234 115 L230 110Z" />
          </g>
        </g>
      </g>
      <g id="desk" stroke="#5e4141" strokeWidth="1.6">
        <path d="M45 240 L309 240 L329 263 L29 263Z" fill="#a27d69" />
        <path d="M29 263 L329 263 L325 280 L35 280Z" fill="url(#wood)" />
        <path
          d="M48 281 L48 294 L60 294 L64 281 M298 281 L300 294 L312 294 L312 281"
          fill="#44343b"
        />
        <path d="M45 271 L314 271" stroke="#c3a079" strokeWidth="1" />
      </g>
      <g id="keyboard" stroke="#67595b" strokeWidth="1">
        <path d="M108 230 L227 230 L241 252 L97 252Z" fill="#e8ded1" />
        {Array.from({ length: 24 }, (_, i) => (
          <rect
            key={i}
            x={111 + (i % 8) * 14 - Math.floor(i / 8) * 3}
            y={233 + Math.floor(i / 8) * 5}
            width="10"
            height="3"
            rx="1"
            fill={i === 17 ? '#b47770' : '#b9ac9e'}
            stroke="none"
          />
        ))}
      </g>
      <g id="mouse">
        <ellipse cx="264" cy="245" rx="18" ry="8" fill="#594852" opacity=".25" />
        <path
          d="M252 240 Q251 226 264 226 Q274 228 276 240 Q264 247 252 240"
          fill="#e9dbca"
          stroke="#70565b"
        />
        <path d="M264 228 L264 234" stroke="#aa6b68" strokeWidth="2" />
      </g>
      <g id="arms" stroke="#6c4249" strokeWidth="1.7">
        <g className="arm arm-left">
          <path d="M132 194 Q113 191 105 213 L135 229 L154 209Z" fill="#39323b" />
          <path d="M109 205 L137 220 L133 231 L103 216Z" fill="#a34a53" stroke="#c4a170" />
          <path
            d="M137 217 Q145 216 157 224 Q166 231 156 236 L137 233 Q128 228 137 217Z"
            fill="#ffdfcb"
          />
          <path d="M145 229 L146 233 M152 228 L154 232" fill="none" strokeWidth="1" />
        </g>
        <g className="arm arm-right">
          <path d="M226 191 Q243 190 253 209 L235 227 L210 210Z" fill="#39323b" />
          <path d="M231 213 L250 203 L257 214 L238 227Z" fill="#a34a53" stroke="#c4a170" />
          <path
            d="M239 218 Q252 219 262 226 Q269 233 259 237 L240 231 Q232 226 239 218Z"
            fill="#ffdfcb"
          />
          <path d="M250 229 L252 232 M257 228 L260 232" fill="none" strokeWidth="1" />
          <g className="stamp-prop">
            <path
              d="M252 227 L253 216 Q242 208 250 202 Q260 198 264 206 Q265 211 259 216 L261 227Z"
              fill="#a55350"
            />
            <rect x="247" y="225" width="21" height="6" rx="2" fill="#ba945a" />
          </g>
        </g>
      </g>
      <g className="tea-prop" stroke="#887763" strokeWidth="1.3">
        <ellipse cx="86" cy="248" rx="13" ry="3" fill="#d4c6ac" />
        <path d="M76 233 L95 233 L92 246 L80 246Z" fill="#f4ead7" />
        <path d="M95 235 Q106 234 98 242 L94 242" fill="none" />
        <path
          className="steam"
          d="M82 228 Q77 222 83 219 M91 228 Q96 222 89 215"
          stroke="#c4a58d"
          fill="none"
        />
      </g>
      <g id="lamp" {...action(onLamp)} aria-label="打开长明专注" className="prop-button">
        <circle cx="51" cy="220" r="35" fill="url(#glow)" opacity={0.45 + progress * 0.55} />
        <path d="M43 251 L60 251 L60 256 L39 256Z" fill="#796047" />
        <path d="M49 222 L51 253" stroke="#846244" strokeWidth="3" />
        <path
          d="M34 214 L65 214 L61 235 L38 235Z"
          fill="#f0d18d"
          stroke="#91653e"
          strokeWidth="1.5"
        />
        <path d="M32 214 L49 202 L67 214Z" fill="#a65b50" stroke="#79463e" />
        <path d="M46 224 Q42 220 51 216 Q58 225 50 231 Q44 230 46 224" fill="#fff3c2" />
      </g>
      <g
        id="scroll"
        {...action(onScroll)}
        aria-label="打开今日待办"
        className="prop-button scroll-prop"
      >
        <rect x="268" y="252" width="55" height="25" rx="2" fill="#eee1bc" stroke="#ac895e" />
        <path d="M271 260 L308 260 M271 265 L299 265" stroke="#b7a080" />
        <rect x="263" y="249" width="6" height="30" rx="2" fill="#ab7754" />
        <rect x="321" y="249" width="6" height="30" rx="2" fill="#ab7754" />
        <text x="293" y="273" textAnchor="middle" fontSize="6" fill="#8a4747" stroke="none">
          {priority ? '今日要务' : '待书之事'}
        </text>
      </g>
      <g className="feathers" fill="#dfb65e">
        {Array.from({ length: 7 }, (_, i) => (
          <path
            key={i}
            style={{ animationDelay: `${i * 0.11}s` }}
            d={`M${78 + i * 31} ${190 - (i % 3) * 18} q-7 -12 1 -20 q9 10 -1 20`}
          />
        ))}
      </g>
      <text x="180" y="312" textAnchor="middle" fill="#8d7166" fontSize="8" letterSpacing="1.5">
        分层动作占位稿 · 待替换精细美术
      </text>
    </svg>
  );
}
