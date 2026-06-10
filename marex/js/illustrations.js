/* Labeled schematic illustrations for the guide. One <svg> per guide id.
   Label texts come from ILLUS_STRINGS (ISTR) so they follow the app language. */

function guideSVG(id) {
  const fn = ILLUS[id];
  return fn ? fn() : "";
}

/* shared bits */
const I = {
  open: `<svg viewBox="0 0 460 230" xmlns="http://www.w3.org/2000/svg" font-family="-apple-system,Segoe UI,Roboto,sans-serif">
         <rect width="460" height="230" fill="#fafafa"/>`,
  close: `</svg>`,
  // label with a pointer line: I.lab(textX, textY, pointX, pointY, text, anchor)
  lab(tx, ty, px, py, text, anchor = "start") {
    return `<line x1="${tx}" y1="${ty + 4}" x2="${px}" y2="${py}" stroke="#dc2626" stroke-width="1.2"/>
            <circle cx="${px}" cy="${py}" r="2.5" fill="#dc2626"/>
            <text x="${tx}" y="${ty}" font-size="11.5" font-weight="600" fill="#18181b" text-anchor="${anchor}">${text}</text>`;
  },
  // second line under a label
  lab2(tx, ty, text, anchor = "start") {
    return `<text x="${tx}" y="${ty}" font-size="11.5" font-weight="600" fill="#18181b" text-anchor="${anchor}">${text}</text>`;
  },
  title(t) {
    return `<text x="230" y="222" font-size="11" fill="#71717a" text-anchor="middle">${t}</text>`;
  },
};

const NAVY = "#18181b", SEA = "#0e6ba8", LIGHT = "#e4ecf2", METAL = "#a1a1aa", RUBBER = "#3f3f46";

const ILLUS = {

  impeller: () => I.open + `
    <circle cx="160" cy="115" r="78" fill="${LIGHT}" stroke="${NAVY}" stroke-width="3"/>
    <circle cx="160" cy="115" r="64" fill="#fff" stroke="${NAVY}" stroke-width="1.5"/>
    ${[0,60,120,180,240,300].map(a => `
      <path d="M160 115 Q ${160 + 55 * Math.cos((a - 28) * Math.PI / 180)} ${115 + 55 * Math.sin((a - 28) * Math.PI / 180)}
               ${160 + 60 * Math.cos(a * Math.PI / 180)} ${115 + 60 * Math.sin(a * Math.PI / 180)}"
            fill="none" stroke="${RUBBER}" stroke-width="9" stroke-linecap="round"/>`).join("")}
    <circle cx="160" cy="115" r="14" fill="${METAL}" stroke="${NAVY}" stroke-width="2"/>
    <circle cx="160" cy="115" r="5" fill="${NAVY}"/>
    ${[45,135,225,315].map(a => `<circle cx="${160 + 73 * Math.cos(a * Math.PI / 180)}" cy="${115 + 73 * Math.sin(a * Math.PI / 180)}" r="4" fill="${METAL}" stroke="${NAVY}" stroke-width="1.5"/>`).join("")}
    ${I.lab(295, 50, 205, 80, ISTR.imp_vanes1)}
    ${I.lab2(295, 62, ISTR.imp_vanes2)}
    ${I.lab(295, 120, 226, 118, ISTR.imp_screws)}
    ${I.lab(295, 160, 172, 117, ISTR.imp_hub1)}
    ${I.lab2(295, 172, ISTR.imp_hub2)}
    ${I.title(ISTR.imp_title)}` + I.close,

  strainer: () => I.open + `
    <rect x="140" y="38" width="90" height="18" rx="4" fill="${METAL}" stroke="${NAVY}" stroke-width="2"/>
    <rect x="150" y="56" width="70" height="110" rx="8" fill="#eef4f9" stroke="${NAVY}" stroke-width="2.5"/>
    <path d="M158 70 h54 M158 84 h54 M158 98 h54 M158 112 h54 M158 126 h54 M158 140 h54" stroke="${METAL}" stroke-width="1.5"/>
    <rect x="158" y="64" width="54" height="86" fill="none" stroke="${SEA}" stroke-width="2" rx="4"/>
    <rect x="80" y="120" width="70" height="14" rx="4" fill="${LIGHT}" stroke="${NAVY}" stroke-width="2"/>
    <rect x="220" y="80" width="70" height="14" rx="4" fill="${LIGHT}" stroke="${NAVY}" stroke-width="2"/>
    <rect x="60" y="112" width="22" height="30" rx="4" fill="${METAL}" stroke="${NAVY}" stroke-width="2"/>
    <line x1="71" y1="112" x2="71" y2="92" stroke="${NAVY}" stroke-width="5" stroke-linecap="round"/>
    ${I.lab(300, 45, 226, 47, ISTR.str_lid)}
    ${I.lab(300, 115, 214, 105, ISTR.str_basket1)}
    ${I.lab2(300, 127, ISTR.str_basket2)}
    ${I.lab(40, 180, 70, 140, ISTR.str_from1)}
    ${I.lab2(40, 192, ISTR.str_from2)}
    ${I.lab(300, 165, 285, 90, ISTR.str_to)}
    ${I.title(ISTR.str_title)}` + I.close,

  anodes: () => I.open + `
    <rect x="30" y="100" width="200" height="12" rx="6" fill="${METAL}" stroke="${NAVY}" stroke-width="2"/>
    <rect x="95" y="90" width="42" height="32" rx="6" fill="#c4ccd4" stroke="${NAVY}" stroke-width="2.5"/>
    <path d="M242 106 q 26 -44 16 -58 q -30 6 -36 46 M242 106 q 26 44 16 58 q -30 -6 -36 -46" fill="${LIGHT}" stroke="${NAVY}" stroke-width="2.5"/>
    <circle cx="238" cy="106" r="10" fill="${METAL}" stroke="${NAVY}" stroke-width="2"/>
    <rect x="300" y="60" width="26" height="110" rx="8" fill="${LIGHT}" stroke="${NAVY}" stroke-width="2.5"/>
    <circle cx="313" cy="115" r="11" fill="#c4ccd4" stroke="${NAVY}" stroke-width="2.5"/>
    ${I.lab(60, 50, 112, 90, ISTR.ano_shaft)}
    ${I.lab(150, 195, 245, 150, ISTR.ano_prop, "end")}
    ${I.lab(400, 40, 316, 62, ISTR.ano_rudder, "end")}
    ${I.lab(420, 195, 324, 117, ISTR.ano_disc, "end")}
    ${I.title(ISTR.ano_title)}` + I.close,

  antifoul: () => I.open + `
    <path d="M40 95 L360 95 L330 105 Q 320 170 230 172 L120 172 Q 60 168 48 110 Z" fill="#fff" stroke="${NAVY}" stroke-width="2.5"/>
    <path d="M44 118 L338 118 L330 105 Q 320 170 230 172 L120 172 Q 60 168 48 110 Z" fill="#b03a3a" stroke="${NAVY}" stroke-width="1.5"/>
    <line x1="20" y1="118" x2="440" y2="118" stroke="${SEA}" stroke-width="2.5" stroke-dasharray="8 5"/>
    <rect x="40" y="80" width="320" height="15" fill="${LIGHT}" stroke="${NAVY}" stroke-width="2"/>
    ${I.lab(40, 40, 200, 87, ISTR.anf_hull)}
    ${I.lab(370, 40, 400, 116, ISTR.anf_wl)}
    ${I.lab(70, 200, 160, 160, ISTR.anf_paint)}
    ${I.title(ISTR.anf_title)}` + I.close,

  seacocks: () => I.open + `
    <rect x="30" y="160" width="400" height="14" fill="#d6c5a8" stroke="${NAVY}" stroke-width="2"/>
    <rect x="172" y="146" width="56" height="14" rx="3" fill="${METAL}" stroke="${NAVY}" stroke-width="2"/>
    <rect x="178" y="98" width="44" height="48" rx="8" fill="#caa84a" stroke="${NAVY}" stroke-width="2.5"/>
    <line x1="200" y1="104" x2="252" y2="70" stroke="#b03a3a" stroke-width="8" stroke-linecap="round"/>
    <rect x="186" y="58" width="28" height="40" rx="4" fill="${LIGHT}" stroke="${NAVY}" stroke-width="2"/>
    <path d="M186 40 q 14 -14 28 0 v 18 h -28 Z" fill="${LIGHT}" stroke="${NAVY}" stroke-width="2"/>
    <path d="M196 185 q 8 6 0 12 M206 185 q 8 6 0 12" stroke="${SEA}" stroke-width="2" fill="none"/>
    ${I.lab(300, 60, 255, 68, ISTR.sea_handle1)}
    ${I.lab2(300, 72, ISTR.sea_handle2)}
    ${I.lab(80, 80, 184, 75, ISTR.sea_hose1, "end")}
    ${I.lab2(80, 92, ISTR.sea_hose2, "end")}
    ${I.lab(70, 130, 178, 120, ISTR.sea_valve, "end")}
    ${I.lab(300, 200, 228, 167, ISTR.sea_thru)}
    ${I.title(ISTR.sea_title)}` + I.close,

  shaftseal: () => I.open + `
    <rect x="30" y="70" width="90" height="80" rx="10" fill="${LIGHT}" stroke="${NAVY}" stroke-width="2.5"/>
    <text x="75" y="115" font-size="12" font-weight="700" fill="${NAVY}" text-anchor="middle">${ISTR.shs_gearbox}</text>
    <rect x="120" y="100" width="240" height="14" rx="7" fill="${METAL}" stroke="${NAVY}" stroke-width="2"/>
    <path d="M168 84 q 10 12 0 23 q 10 12 0 23 l 26 0 q -10 -11 0 -23 q -10 -11 0 -23 Z" fill="${RUBBER}" stroke="${NAVY}" stroke-width="2"/>
    <path d="M250 60 L250 154 L380 175 L380 40 Z" fill="#d6c5a8" stroke="${NAVY}" stroke-width="2.5" opacity=".9"/>
    <path d="M362 20 q 8 6 0 12 M376 20 q 8 6 0 12" stroke="${SEA}" stroke-width="2" fill="none"/>
    ${I.lab(110, 40, 180, 85, ISTR.shs_seal1)}
    ${I.lab2(110, 52, ISTR.shs_seal2)}
    ${I.lab(60, 195, 210, 110, ISTR.shs_shaft)}
    ${I.lab(420, 195, 310, 130, ISTR.shs_hull, "end")}
    ${I.title(ISTR.shs_title)}` + I.close,

  oilcheck: () => I.open + `
    <rect x="60" y="70" width="180" height="110" rx="12" fill="${LIGHT}" stroke="${NAVY}" stroke-width="2.5"/>
    <rect x="80" y="50" width="140" height="24" rx="6" fill="${METAL}" stroke="${NAVY}" stroke-width="2"/>
    <circle cx="130" cy="98" r="14" fill="none" stroke="#e0a90c" stroke-width="6"/>
    <line x1="130" y1="112" x2="130" y2="165" stroke="#e0a90c" stroke-width="5"/>
    <rect x="280" y="78" width="74" height="92" rx="10" fill="#f4f8fb" stroke="${NAVY}" stroke-width="2.5"/>
    <rect x="284" y="120" width="66" height="46" rx="6" fill="#9fd08c" opacity=".75"/>
    <line x1="280" y1="100" x2="354" y2="100" stroke="${NAVY}" stroke-width="1.5" stroke-dasharray="4 3"/>
    <line x1="280" y1="152" x2="354" y2="152" stroke="${NAVY}" stroke-width="1.5" stroke-dasharray="4 3"/>
    <text x="358" y="103" font-size="10" font-weight="700" fill="${NAVY}">MAX</text>
    <text x="358" y="155" font-size="10" font-weight="700" fill="${NAVY}">MIN</text>
    <circle cx="317" cy="70" r="12" fill="${METAL}" stroke="${NAVY}" stroke-width="2"/>
    ${I.lab(40, 40, 122, 88, ISTR.oil_dip1)}
    ${I.lab2(40, 52, ISTR.oil_dip2)}
    ${I.lab(250, 40, 312, 60, ISTR.oil_cap1)}
    ${I.lab2(250, 52, ISTR.oil_cap2)}
    ${I.lab(250, 205, 300, 145, ISTR.oil_cool)}
    ${I.title(ISTR.oil_title)}` + I.close,

  fuelsep: () => I.open + `
    <rect x="150" y="30" width="100" height="22" rx="5" fill="${METAL}" stroke="${NAVY}" stroke-width="2"/>
    <rect x="158" y="52" width="84" height="90" rx="8" fill="#e0e4e8" stroke="${NAVY}" stroke-width="2.5"/>
    <rect x="166" y="142" width="68" height="48" rx="8" fill="#f5d98f" stroke="${NAVY}" stroke-width="2.5"/>
    <rect x="166" y="168" width="68" height="22" rx="6" fill="#7db3d8" stroke="${NAVY}" stroke-width="1.5"/>
    <rect x="192" y="190" width="16" height="14" rx="3" fill="${METAL}" stroke="${NAVY}" stroke-width="2"/>
    <rect x="80" y="34" width="70" height="13" rx="4" fill="${LIGHT}" stroke="${NAVY}" stroke-width="2"/>
    <rect x="250" y="34" width="70" height="13" rx="4" fill="${LIGHT}" stroke="${NAVY}" stroke-width="2"/>
    ${I.lab(60, 80, 156, 90, ISTR.fue_elem, "end")}
    ${I.lab(300, 130, 236, 152, ISTR.fue_bowl1)}
    ${I.lab(300, 168, 236, 178, ISTR.fue_bowl2)}
    ${I.lab(300, 205, 210, 198, ISTR.fue_drain)}
    ${I.lab(60, 200, 100, 47, ISTR.fue_tank)}
    ${I.title(ISTR.fue_title)}` + I.close,

  belts: () => I.open + `
    <circle cx="110" cy="140" r="44" fill="${METAL}" stroke="${NAVY}" stroke-width="3"/>
    <circle cx="110" cy="140" r="12" fill="${NAVY}"/>
    <circle cx="250" cy="80" r="30" fill="${METAL}" stroke="${NAVY}" stroke-width="3"/>
    <circle cx="250" cy="80" r="9" fill="${NAVY}"/>
    <circle cx="310" cy="165" r="24" fill="${METAL}" stroke="${NAVY}" stroke-width="3"/>
    <circle cx="310" cy="165" r="8" fill="${NAVY}"/>
    <path d="M84 105 Q 160 30 250 50 Q 300 60 332 150 Q 330 192 286 184 Q 180 200 78 175 Q 64 130 84 105"
          fill="none" stroke="${RUBBER}" stroke-width="9"/>
    <path d="M180 62 l6 14 M196 58 l5 14 M212 56 l4 14" stroke="#dc2626" stroke-width="2.5"/>
    ${I.lab(50, 50, 90, 110, ISTR.bel_crank)}
    ${I.lab(330, 40, 268, 60, ISTR.bel_alt)}
    ${I.lab(360, 205, 322, 182, ISTR.bel_pump, "end")}
    ${I.lab(120, 30, 196, 64, ISTR.bel_crack1)}
    ${I.lab2(120, 42, ISTR.bel_crack2)}
    ${I.title(ISTR.bel_title)}` + I.close,

  batteries: () => I.open + `
    <rect x="60" y="80" width="130" height="90" rx="10" fill="${LIGHT}" stroke="${NAVY}" stroke-width="2.5"/>
    <rect x="78" y="62" width="22" height="18" rx="4" fill="#b03a3a" stroke="${NAVY}" stroke-width="2"/>
    <rect x="150" y="62" width="22" height="18" rx="4" fill="${RUBBER}" stroke="${NAVY}" stroke-width="2"/>
    <text x="125" y="130" font-size="13" font-weight="700" fill="${NAVY}" text-anchor="middle">${ISTR.bat_start}</text>
    <rect x="220" y="80" width="130" height="90" rx="10" fill="${LIGHT}" stroke="${NAVY}" stroke-width="2.5"/>
    <rect x="238" y="62" width="22" height="18" rx="4" fill="#b03a3a" stroke="${NAVY}" stroke-width="2"/>
    <rect x="310" y="62" width="22" height="18" rx="4" fill="${RUBBER}" stroke="${NAVY}" stroke-width="2"/>
    <text x="285" y="130" font-size="13" font-weight="700" fill="${NAVY}" text-anchor="middle">${ISTR.bat_house}</text>
    <rect x="92" y="142" width="66" height="20" rx="5" fill="#fff" stroke="${NAVY}" stroke-width="1.5"/>
    <text x="125" y="157" font-size="12" font-weight="700" fill="#16a34a" text-anchor="middle">12.6 V</text>
    ${I.lab(40, 40, 88, 64, ISTR.bat_term1)}
    ${I.lab2(40, 52, ISTR.bat_term2)}
    ${I.lab(290, 40, 285, 78, ISTR.bat_house1)}
    ${I.lab2(290, 52, ISTR.bat_house2)}
    ${I.lab(60, 205, 120, 165, ISTR.bat_volt)}
    ${I.title(ISTR.bat_title)}` + I.close,

  bilge: () => I.open + `
    <path d="M40 40 Q 60 150 200 168 Q 340 150 360 40" fill="none" stroke="${NAVY}" stroke-width="4"/>
    <path d="M120 130 Q 160 158 200 160 Q 250 158 285 132 L285 145 Q 250 170 200 172 Q 150 170 120 145 Z" fill="${SEA}" opacity=".35"/>
    <rect x="180" y="128" width="42" height="32" rx="6" fill="${METAL}" stroke="${NAVY}" stroke-width="2.5"/>
    <rect x="230" y="138" width="34" height="14" rx="7" fill="${RUBBER}" stroke="${NAVY}" stroke-width="2"/>
    <path d="M200 128 V 70 Q 200 56 216 56 L330 56" fill="none" stroke="${SEA}" stroke-width="7"/>
    ${I.lab(70, 80, 188, 135, ISTR.bil_pump, "end")}
    ${I.lab(310, 110, 252, 142, ISTR.bil_float1)}
    ${I.lab2(310, 122, ISTR.bil_float2)}
    ${I.lab(340, 30, 326, 54, ISTR.bil_out)}
    ${I.lab(70, 200, 160, 162, ISTR.bil_low)}
    ${I.title(ISTR.bil_title)}` + I.close,

  trimtabs: () => I.open + `
    <path d="M70 40 L330 40 L320 130 Q 200 150 80 130 Z" fill="${LIGHT}" stroke="${NAVY}" stroke-width="2.5"/>
    <rect x="95" y="132" width="80" height="12" rx="3" fill="${METAL}" stroke="${NAVY}" stroke-width="2" transform="rotate(8 135 138)"/>
    <rect x="225" y="132" width="80" height="12" rx="3" fill="${METAL}" stroke="${NAVY}" stroke-width="2" transform="rotate(-8 265 138)"/>
    <line x1="120" y1="118" x2="132" y2="138" stroke="${NAVY}" stroke-width="5"/>
    <line x1="280" y1="118" x2="268" y2="138" stroke="${NAVY}" stroke-width="5"/>
    <circle cx="160" cy="143" r="5" fill="#c4ccd4" stroke="${NAVY}" stroke-width="1.5"/>
    <circle cx="240" cy="143" r="5" fill="#c4ccd4" stroke="${NAVY}" stroke-width="1.5"/>
    <line x1="20" y1="160" x2="440" y2="160" stroke="${SEA}" stroke-width="2.5" stroke-dasharray="8 5"/>
    ${I.lab(40, 80, 128, 125, ISTR.tri_ram)}
    ${I.lab(340, 80, 270, 136, ISTR.tri_plate)}
    ${I.lab(60, 200, 158, 146, ISTR.tri_anode)}
    ${I.title(ISTR.tri_title)}` + I.close,

  thruster: () => I.open + `
    <path d="M440 40 Q 180 48 100 80 Q 50 100 44 150 L 440 150 Z" fill="${LIGHT}" stroke="${NAVY}" stroke-width="2.5"/>
    <line x1="20" y1="95" x2="450" y2="95" stroke="${SEA}" stroke-width="2.5" stroke-dasharray="8 5"/>
    <ellipse cx="95" cy="123" rx="26" ry="17" fill="#fff" stroke="${NAVY}" stroke-width="2.5"/>
    <line x1="95" y1="108" x2="95" y2="138" stroke="${NAVY}" stroke-width="3"/>
    <path d="M95 112 q 9 5 0 11 q 9 5 0 11" fill="none" stroke="${NAVY}" stroke-width="2.5"/>
    <circle cx="108" cy="123" r="4" fill="#c4ccd4" stroke="${NAVY}" stroke-width="1.5"/>
    ${I.lab(40, 50, 90, 107, ISTR.thr_tunnel)}
    ${I.lab(240, 195, 112, 125, ISTR.thr_prop)}
    ${I.lab(330, 70, 360, 92, ISTR.thr_wl)}
    ${I.title(ISTR.thr_title)}` + I.close,

  heater: () => I.open + `
    <rect x="120" y="70" width="120" height="70" rx="12" fill="${LIGHT}" stroke="${NAVY}" stroke-width="2.5"/>
    <circle cx="155" cy="105" r="20" fill="#fff" stroke="${NAVY}" stroke-width="2"/>
    <path d="M155 90 l6 12 h-12 Z M149 110 h12 l-6 12 Z" fill="#d8860b"/>
    <rect x="240" y="92" width="110" height="26" rx="13" fill="#f3c66b" stroke="${NAVY}" stroke-width="2"/>
    <path d="M355 96 q 10 9 0 18" stroke="#d8860b" stroke-width="3" fill="none"/>
    <path d="M120 110 h-50 q -14 0 -14 14 v 60" fill="none" stroke="${METAL}" stroke-width="7"/>
    <path d="M180 140 v 40 h 60" fill="none" stroke="${RUBBER}" stroke-width="5"/>
    ${I.lab(60, 50, 150, 92, ISTR.hea_burn1)}
    ${I.lab2(60, 62, ISTR.hea_burn2)}
    ${I.lab(300, 60, 290, 90, ISTR.hea_duct)}
    ${I.lab(40, 205, 56, 170, ISTR.hea_exh)}
    ${I.lab(300, 205, 235, 180, ISTR.hea_pump)}
    ${I.title(ISTR.hea_title)}` + I.close,

  rudder: () => I.open + `
    <rect x="30" y="60" width="400" height="14" fill="#d6c5a8" stroke="${NAVY}" stroke-width="2"/>
    <rect x="186" y="20" width="28" height="40" rx="5" fill="${METAL}" stroke="${NAVY}" stroke-width="2.5"/>
    <line x1="200" y1="74" x2="200" y2="120" stroke="${NAVY}" stroke-width="9"/>
    <path d="M200 115 q 50 10 44 80 q -44 14 -58 -6 q -8 -50 14 -74" fill="${LIGHT}" stroke="${NAVY}" stroke-width="2.5"/>
    ${I.lab(60, 40, 184, 40, ISTR.rud_bear1)}
    ${I.lab2(60, 52, ISTR.rud_bear2)}
    ${I.lab(300, 110, 212, 100, ISTR.rud_stock1)}
    ${I.lab2(300, 122, ISTR.rud_stock2)}
    ${I.lab(80, 195, 190, 170, ISTR.rud_blade)}
    ${I.title(ISTR.rud_title)}` + I.close,
};
