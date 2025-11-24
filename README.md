# 🐍 Snake AI

Klassinen Snake-peli modernilla JavaScript-toteutuksella, joka sisältää sekä manuaalisen pelitilan että edistyneen tekoäly-botin (BFS & Flood Fill -algoritmit) käärmeen ohjaamiseen.

## Kuvakaappaus

## ![Pelikuva](screenshot.png?v=1)

## Ominaisuudet

- **Kaksoistila:** Pelaajaohjaus (WASD/nuolet) ja tekoäly-ohjattu tila.
- **Kehittynyt Botti:** Käyttää **Breadth-First Search (BFS)** -algoritmia löytääkseen ruoan nopeasti ja **Flood Fill** -algoritmia välttääkseen ansat.
- **Pisteet ja Huipputulos:** Seuraa nykyistä pistemäärää ja tallentaa huipputuloksen selaimen `localStorage`-muistiin.
- **Äänitehosteet:** Yksinkertaiset äänimerkit syömiselle ja Game Over -tilanteelle (Web Audio API).

---

## Pelaaminen

1.  **Avaa** peli selaimessasi.
2.  Valitse tilanne:
    - Paina **`1`** pelataksesi itse (**PLAYER**-tila).
    - Paina **`2`** nähdäksesi tekoälyn pelaavan (**BOT**-tila).
3.  **Ohjaimet (PLAYER-tila):**
    - Nuolinäppäimet **tai** WASD-näppäimet liikkumiseen.
4.  **Game Over:**
    - Paina **Välilyöntiä** aloittaaksesi uudelleen samassa tilassa.
    - Paina **`Q`** palataksesi päävalikkoon.

---

## Tekniikka

- **HTML5** Canvas
- **Vanilla JavaScript** (ei ulkoisia kirjastoja)
- **Web Audio API** ääniefekteihin
