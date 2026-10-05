const thumb: string = "👍🏽";                  // thumbs up + skin tone: one visible symbol
const seg = new Intl.Segmenter("en", { granularity: "grapheme" });
console.log(thumb.length, [...thumb].length, [...seg.segment(thumb)].length);
