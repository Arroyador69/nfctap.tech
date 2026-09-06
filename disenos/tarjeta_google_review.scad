// Tarjeta NFC para reseñas de Google — Flashforge AD5X
// Abre en OpenSCAD (https://openscad.org) y pulsa F6 para exportar STL.
// Cambia los parámetros en el Customizer (panel izquierdo).

/* [Tarjeta] */
ancho = 86;          // mm  (tamaño tarjeta de crédito)
alto  = 54;
grosor = 3.6;
radio = 4;

/* [NFC] */
// Stock: Timeskey B08LD99GZT — pegatina PET NTAG215 Ø25 mm. Hueco holgado Ø28.4.
nfc_tipo = "moneda";   // [tira, moneda]
nfc_tira_w = 47;
nfc_tira_h = 17;
nfc_moneda_d = 28.4;
nfc_grosor = 0.8;
nfc_desde_base = 1.2;  // deja 6 capas de 0.2 mm debajo

/* [Pieza a generar] */
pieza = "cuerpo";    // [cuerpo, estrellas, texto, icono, soporte, ensamblado]

/* [Texto] */
linea1 = "TOCA PARA";
linea2 = "RESENA";

$fn = 48;

module tarjeta_redondeada(w, h, r, t) {
    linear_extrude(t)
        offset(r=r)
            square([w - 2*r, h - 2*r], center=true);
}

module hueco_nfc() {
    translate([0, 0, nfc_desde_base])
        if (nfc_tipo == "moneda")
            cylinder(h=nfc_grosor, d=nfc_moneda_d);
        else
            translate([0, 0, nfc_grosor/2])
                cube([nfc_tira_w, nfc_tira_h, nfc_grosor], center=true);
}

module cuerpo() {
    difference() {
        tarjeta_redondeada(ancho, alto, radio, grosor);
        hueco_nfc();
    }
}

module estrella(r=3.6) {
    points = [for (i = [0:9])
        let(a = i * 36 - 90, rr = i % 2 == 0 ? r : r * 0.42)
        [rr * cos(a), rr * sin(a)]
    ];
    linear_extrude(0.4) polygon(points);
}

module estrellas() {
    translate([0, 0, grosor])
        for (i = [-2:2])
            translate([i * 9, alto/2 - 10, 0])
                estrella();
}

module textos() {
    translate([6, 4.5, grosor])
        linear_extrude(0.4)
            text(linea1, size=5.5, font="Liberation Sans:style=Bold",
                 halign="center", valign="center");
    translate([6, -6.5, grosor])
        linear_extrude(0.4)
            text(linea2, size=7.5, font="Liberation Sans:style=Bold",
                 halign="center", valign="center");
}

module icono() {
    translate([-ancho/2 + 14, 0, grosor]) {
        difference() {
            cylinder(h=0.4, r=8.2);
            translate([0, 0, -0.1]) cylinder(h=0.6, r=6.6);
        }
        estrella(4.4);
    }
}

module soporte() {
    base_w = ancho + 8;
    base_d = 28;
    translate([0, 0, 0])
        linear_extrude(3)
            offset(r=3) square([base_w - 6, base_d - 6], center=true);
    translate([0, -base_d/2 + 8, 0])
        cube([base_w, 10, alto * 0.55], center=false);
}

if (pieza == "cuerpo")      cuerpo();
else if (pieza == "estrellas") estrellas();
else if (pieza == "texto")   textos();
else if (pieza == "icono")   icono();
else if (pieza == "soporte") soporte();
else {
    color("#222") cuerpo();
    color("#F4C430") estrellas();
    color("#FFF") textos();
    color("#FFF") icono();
}
