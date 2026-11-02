// Package cardspec holds the limits of the card data format. The same JSON files
// are imported by normalizeCard() in the frontend, so that both sides agree.
package cardspec

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"regexp"
	"slices"
	"unicode/utf8"
)

// hexColor is the only form of a custom colour. An empty value means the colour of the card.
var hexColor = regexp.MustCompile(`^#[0-9a-fA-F]{6}$`)

//go:embed spec.json
var specJSON []byte

//go:embed templates.json
var templatesJSON []byte

// Spec is the parsed spec.json.
type Spec struct {
	Enums  map[string][]string   `json:"enums"`
	Ranges map[string][2]float64 `json:"ranges"`
	Text   map[string]int        `json:"text"`
	Counts map[string]int        `json:"counts"`
}

// Template is one system template from templates.json.
type Template struct {
	Slug     string         `json:"slug"`
	Name     string         `json:"name"`
	Family   string         `json:"family"`
	FormatW  int            `json:"formatW"`
	FormatH  int            `json:"formatH"`
	Defaults map[string]any `json:"defaults"`
}

var limits = mustParse[Spec](specJSON)

func mustParse[T any](raw []byte) T {
	var v T
	if err := json.Unmarshal(raw, &v); err != nil {
		panic(fmt.Errorf("cardspec: %w", err))
	}
	return v
}

// Limits returns the parsed spec.json.
func Limits() Spec {
	return limits
}

// Templates returns the system templates. It returns a fresh copy on every call.
func Templates() []Template {
	return mustParse[[]Template](templatesJSON)
}

// Problems collects human readable validation failures, one per offending value.
type Problems []string

func (p *Problems) addf(format string, args ...any) {
	*p = append(*p, fmt.Sprintf(format, args...))
}

func (p *Problems) enum(obj map[string]any, key, enum string) {
	v, ok := obj[key]
	if !ok {
		return
	}
	s, ok := v.(string)
	if !ok || !slices.Contains(limits.Enums[enum], s) {
		p.addf("%s: unknown value", key)
	}
}

func (p *Problems) number(obj map[string]any, key, rng string) {
	v, ok := obj[key]
	if !ok {
		return
	}
	n, ok := v.(float64)
	bounds := limits.Ranges[rng]
	if !ok || n < bounds[0] || n > bounds[1] {
		p.addf("%s: must be a number from %g to %g", key, bounds[0], bounds[1])
	}
}

func (p *Problems) text(obj map[string]any, key, limit string) {
	v, ok := obj[key]
	if !ok {
		return
	}
	s, ok := v.(string)
	if !ok {
		p.addf("%s: must be a string", key)
		return
	}
	if utf8.RuneCountInString(s) > limits.Text[limit] {
		p.addf("%s: longer than %d characters", key, limits.Text[limit])
	}
}

func (p *Problems) boolean(obj map[string]any, key string) {
	if v, ok := obj[key]; ok {
		if _, isBool := v.(bool); !isBool {
			p.addf("%s: must be true or false", key)
		}
	}
}

func (p *Problems) color(obj map[string]any, key string) {
	v, ok := obj[key]
	if !ok {
		return
	}
	if s, isText := v.(string); !isText || (s != "" && !hexColor.MatchString(s)) {
		p.addf("%s: must be a colour like #d6b067", key)
	}
}

func (p *Problems) object(obj map[string]any, key string) map[string]any {
	v, ok := obj[key]
	if !ok {
		return nil
	}
	nested, isObject := v.(map[string]any)
	if !isObject {
		p.addf("%s: must be an object", key)
	}
	return nested
}

func (p *Problems) array(obj map[string]any, key, count string) []any {
	v, ok := obj[key]
	if !ok {
		return nil
	}
	list, ok := v.([]any)
	if !ok {
		p.addf("%s: must be a list", key)
		return nil
	}
	if len(list) > limits.Counts[count] {
		p.addf("%s: more than %d items", key, limits.Counts[count])
	}
	return list
}

// ValidateLook checks the `look` JSON. Missing keys are fine, normalizeCard() fills them in.
func ValidateLook(look map[string]any) Problems {
	var p Problems
	for _, key := range []string{"variant", "art", "frame", "palette", "element", "foil", "foilArea", "surface", "texture", "edge", "font", "titleEffect", "skyStyle", "skyPattern"} {
		p.enum(look, key, key)
	}
	for _, key := range []string{"foilI", "foilAngle", "thick", "radius", "depth", "titleScale", "titleSpacing", "titleOffset", "bodyScale", "vignette", "wear", "frameWeight", "textureI"} {
		p.number(look, key, key)
	}
	for _, key := range []string{"emboss", "fullArt", "titleCaps"} {
		p.boolean(look, key)
	}
	p.enum(look, "backPattern", "backPattern")
	// Empty means the same palette as the front.
	if palette, ok := look["backPalette"]; !ok || palette != "" {
		p.enum(look, "backPalette", "palette")
	}
	p.figure(look)

	visible := p.object(look, "visible")
	for _, key := range []string{"art", "frame", "text", "foil"} {
		p.boolean(visible, key)
	}
	parts := p.object(look, "parts")
	for _, key := range []string{"title", "numeral", "subtitle", "plaque", "window", "border", "corners", "ornaments", "rarity", "credit"} {
		p.boolean(parts, key)
	}
	colors := p.object(look, "colors")
	for _, key := range []string{"base", "sky", "metal", "text", "title", "plaque", "panel", "glow", "edge", "backBase", "backMetal"} {
		p.color(colors, key)
	}
	filter := p.object(look, "artFilter")
	p.number(filter, "brightness", "artBrightness")
	p.number(filter, "contrast", "artContrast")
	p.number(filter, "saturate", "artSaturate")
	p.number(filter, "hue", "artHue")
	p.number(filter, "sepia", "artSepia")
	return p
}

// figure checks the illustration of the cards that do not pick one of the tarot arts by
// their `art`. Empty means the illustration of the template. Which of the values fit
// depends on the family, and a card of another family simply does not draw it.
func (p *Problems) figure(look map[string]any) {
	v, ok := look["figure"]
	if !ok || v == "" {
		return
	}
	s, isText := v.(string)
	for _, enum := range []string{"art", "figureBestie", "figureHrdina"} {
		if isText && slices.Contains(limits.Enums[enum], s) {
			return
		}
	}
	p.addf("figure: unknown value")
}

// ValidateContent checks the `content` JSON.
func ValidateContent(content map[string]any) Problems {
	var p Problems
	p.text(content, "numeral", "numeral")
	p.text(content, "subtitle", "subtitle")
	p.text(content, "cls", "cls")
	p.text(content, "setNo", "setNo")
	p.text(content, "artist", "artist")
	p.text(content, "backText", "backText")
	for _, key := range []string{"hp", "level", "cost", "s1", "s2", "s3", "rarity"} {
		p.number(content, key, key)
	}

	labels := p.object(content, "labels")
	for _, key := range []string{"level", "s1", "s2", "s3"} {
		p.text(labels, key, "statLabel")
	}

	for _, item := range p.array(content, "abilities", "abilities") {
		ability, ok := item.(map[string]any)
		if !ok {
			p.addf("abilities: every item must be an object")
			continue
		}
		p.text(ability, "name", "abilityName")
		p.text(ability, "text", "abilityText")
		p.number(ability, "power", "power")
	}

	for _, item := range p.array(content, "elements", "elements") {
		element, ok := item.(map[string]any)
		if !ok {
			p.addf("elements: every item must be an object")
			continue
		}
		p.element(element)
	}
	return p
}

// element checks one freely placed element. Which of the keys matter depends on its type,
// the limits hold for all of them.
func (p *Problems) element(element map[string]any) {
	for key, enum := range map[string]string{"type": "itemType", "side": "itemSide", "font": "itemFont", "align": "itemAlign", "blend": "itemBlend", "effect": "titleEffect"} {
		p.enum(element, key, enum)
	}
	for key, limit := range map[string]string{"id": "itemId", "text": "itemText", "value": "itemValue", "file": "itemFile"} {
		p.text(element, key, limit)
	}
	for key, rng := range map[string]string{"x": "itemPosition", "y": "itemPosition", "size": "itemSize", "rotate": "itemRotate", "opacity": "itemOpacity", "ratio": "itemRatio", "depth": "itemDepth", "shadow": "itemShadow", "spacing": "itemSpacing", "line": "itemLine", "curve": "itemCurve", "stroke": "itemStroke", "border": "itemBorder"} {
		p.number(element, key, rng)
	}
	p.color(element, "color")
	for _, key := range []string{"filled", "hidden", "flipX", "flipY", "locked", "caps"} {
		p.boolean(element, key)
	}
	p.text(element, "kind", "itemId")
	// Empty means the whole image without any cut-out.
	if mask, ok := element["mask"]; ok && mask != "" {
		p.enum(element, "mask", "itemShape")
	}

	kinds := map[string]string{"symbol": "itemSymbol", "ornament": "itemOrnament", "shape": "itemShape", "stat": "itemShape"}
	if enum, ok := kinds[fmt.Sprint(element["type"])]; ok {
		p.enum(element, "kind", enum)
	}
}

// ValidateMeaning checks the `meaning` JSON.
func ValidateMeaning(meaning map[string]any) Problems {
	var p Problems
	p.enum(meaning, "arcana", "arcana")
	p.text(meaning, "upright", "upright")
	p.text(meaning, "reversed", "reversed")

	for _, item := range p.array(meaning, "keywords", "keywords") {
		keyword, ok := item.(string)
		if !ok || utf8.RuneCountInString(keyword) > limits.Text["keyword"] {
			p.addf("keywords: every item must be a string of at most %d characters", limits.Text["keyword"])
		}
	}
	return p
}

// ValidateArtworkTransform checks the `artworkTransform` JSON, which positions the
// main artwork (x, y, zoom) and each parallax layer inside the card window.
func ValidateArtworkTransform(transform map[string]any) Problems {
	var p Problems
	p.placement(transform)

	for _, item := range p.array(transform, "layers", "artworkLayers") {
		layer, ok := item.(map[string]any)
		if !ok {
			p.addf("layers: every item must be an object")
			continue
		}
		p.placement(layer)
	}
	return p
}

func (p *Problems) placement(obj map[string]any) {
	p.number(obj, "x", "artOffset")
	p.number(obj, "y", "artOffset")
	p.number(obj, "zoom", "artZoom")
	p.number(obj, "rotate", "artRotate")
	p.boolean(obj, "flipX")
}

// ValidateDeckBack checks the `back` JSON of a deck.
func ValidateDeckBack(back map[string]any) Problems {
	var p Problems
	p.enum(back, "palette", "palette")
	p.enum(back, "edge", "edge")
	return p
}
