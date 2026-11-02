package cardspec

import (
	"encoding/json"
	"strings"
	"testing"
)

func parse(t *testing.T, raw string) map[string]any {
	t.Helper()
	var v map[string]any
	if err := json.Unmarshal([]byte(raw), &v); err != nil {
		t.Fatal(err)
	}
	return v
}

func TestSystemTemplatesAreValid(t *testing.T) {
	templates := Templates()
	if len(templates) != 5 {
		t.Fatalf("expected 5 system templates, got %d", len(templates))
	}

	for _, tpl := range templates {
		t.Run(tpl.Slug, func(t *testing.T) {
			look, _ := tpl.Defaults["look"].(map[string]any)
			content, _ := tpl.Defaults["content"].(map[string]any)
			meaning, _ := tpl.Defaults["meaning"].(map[string]any)

			if look["variant"] != tpl.Family {
				t.Errorf("look.variant %v does not match family %s", look["variant"], tpl.Family)
			}
			for name, problems := range map[string]Problems{
				"look":    ValidateLook(look),
				"content": ValidateContent(content),
				"meaning": ValidateMeaning(meaning),
			} {
				if len(problems) > 0 {
					t.Errorf("%s: %v", name, problems)
				}
			}
		})
	}
}

func TestValidate(t *testing.T) {
	long := strings.Repeat("ž", 200)

	scenarios := []struct {
		name     string
		validate func(map[string]any) Problems
		value    string
		invalid  bool
	}{
		{"empty look", ValidateLook, `{}`, false},
		{"valid look", ValidateLook, `{"foil":"duha","foilI":100,"thick":1,"visible":{"art":false}}`, false},
		{"unknown foil", ValidateLook, `{"foil":"chrom"}`, true},
		{"foil of a wrong type", ValidateLook, `{"foil":3}`, true},
		{"thick below the range", ValidateLook, `{"thick":0.5}`, true},
		{"radius above the range", ValidateLook, `{"radius":31}`, true},
		{"emboss of a wrong type", ValidateLook, `{"emboss":"yes"}`, true},
		{"visible of a wrong type", ValidateLook, `{"visible":true}`, true},
		{"valid new look options", ValidateLook, `{"fullArt":true,"titleScale":120,"titleCaps":false,"backPalette":"krev","backPattern":"hvezdy","colors":{"base":"#112233","sky":"","metal":"#AABBCC","text":""},"artFilter":{"brightness":120,"contrast":80,"saturate":0,"hue":-30}}`, false},
		{"back palette of the front", ValidateLook, `{"backPalette":""}`, false},
		{"unknown back palette", ValidateLook, `{"backPalette":"modra"}`, true},
		{"unknown back pattern", ValidateLook, `{"backPattern":"kostky"}`, true},
		{"colour in another form", ValidateLook, `{"colors":{"base":"red"}}`, true},
		{"colour that could smuggle CSS", ValidateLook, `{"colors":{"text":"#fff;background:url(x)"}}`, true},
		{"colour of a wrong type", ValidateLook, `{"colors":{"metal":12}}`, true},
		{"colours of a wrong type", ValidateLook, `{"colors":"#112233"}`, true},
		{"title scale above the range", ValidateLook, `{"titleScale":151}`, true},
		{"filter above the range", ValidateLook, `{"artFilter":{"saturate":201}}`, true},
		{"full art of a wrong type", ValidateLook, `{"fullArt":"yes"}`, true},
		{"valid material and background options", ValidateLook, `{"foilArea":"okraj","foilAngle":45,"texture":"platno","textureI":80,"wear":30,"vignette":60,"frameWeight":150,"skyStyle":"zare","skyPattern":"hvezdy"}`, false},
		{"valid title options", ValidateLook, `{"titleEffect":"zare","titleSpacing":-5,"titleOffset":12,"bodyScale":80}`, false},
		{"valid new colours", ValidateLook, `{"colors":{"title":"#112233","plaque":"","panel":"#445566","glow":"#778899","edge":"#aabbcc","backBase":"#000000","backMetal":"#ffffff"}}`, false},
		{"valid parts", ValidateLook, `{"parts":{"numeral":false,"corners":true,"rarity":false}}`, false},
		{"sepia in the range", ValidateLook, `{"artFilter":{"sepia":100}}`, false},
		{"sepia above the range", ValidateLook, `{"artFilter":{"sepia":101}}`, true},
		{"unknown foil area", ValidateLook, `{"foilArea":"rub"}`, true},
		{"foil angle above the range", ValidateLook, `{"foilAngle":181}`, true},
		{"unknown texture", ValidateLook, `{"texture":"kamen"}`, true},
		{"texture strength above the range", ValidateLook, `{"textureI":101}`, true},
		{"wear below the range", ValidateLook, `{"wear":-1}`, true},
		{"vignette above the range", ValidateLook, `{"vignette":101}`, true},
		{"frame weight below the range", ValidateLook, `{"frameWeight":49}`, true},
		{"unknown sky style", ValidateLook, `{"skyStyle":"mraky"}`, true},
		{"unknown sky pattern", ValidateLook, `{"skyPattern":"logo"}`, true},
		{"unknown title effect", ValidateLook, `{"titleEffect":"blikani"}`, true},
		{"title spacing above the range", ValidateLook, `{"titleSpacing":41}`, true},
		{"title offset below the range", ValidateLook, `{"titleOffset":-41}`, true},
		{"body scale above the range", ValidateLook, `{"bodyScale":131}`, true},
		{"parts of a wrong type", ValidateLook, `{"parts":true}`, true},
		{"part of a wrong type", ValidateLook, `{"parts":{"numeral":"ne"}}`, true},
		{"colour of the edge in another form", ValidateLook, `{"colors":{"edge":"gold"}}`, true},
		{"figure of the template", ValidateLook, `{"figure":""}`, false},
		{"figure of an oracle", ValidateLook, `{"figure":"vez"}`, false},
		{"figure of a beast", ValidateLook, `{"figure":"sova"}`, false},
		{"figure of a hero", ValidateLook, `{"figure":"kalich"}`, false},
		{"unknown figure", ValidateLook, `{"figure":"drak"}`, true},
		{"figure of a wrong type", ValidateLook, `{"figure":3}`, true},
		{"new values of the old options", ValidateLook, `{"art":"vez","frame":"baroko","palette":"ruze","element":"voda","foil":"galaxie","surface":"zrcadlo","edge":"duha","font":"uncial","backPattern":"sachovnice"}`, false},

		{"valid content", ValidateContent, `{"numeral":"XVII","hp":70,"abilities":[{"name":"A","power":10,"text":"B"}],"elements":[]}`, false},
		{"numeral at the limit counted in characters", ValidateContent, `{"numeral":"ŽŽŽŽŽŽŽŽ"}`, false},
		{"numeral too long", ValidateContent, `{"numeral":"ŽŽŽŽŽŽŽŽŽ"}`, true},
		{"hp above the range", ValidateContent, `{"hp":201}`, true},
		{"too many abilities", ValidateContent, `{"abilities":[{},{},{}]}`, true},
		{"ability power above the range", ValidateContent, `{"abilities":[{"power":201}]}`, true},
		{"ability name too long", ValidateContent, `{"abilities":[{"name":"` + long + `"}]}`, true},
		{"element that is not an object", ValidateContent, `{"elements":["x"]}`, true},
		{"valid text element", ValidateContent, `{"elements":[{"id":"a1","type":"text","side":"back","x":50,"y":10,"size":8,"rotate":-45,"opacity":100,"color":"","text":"Ahoj","font":"kurziva","align":"left"}]}`, false},
		{"valid symbol element", ValidateContent, `{"elements":[{"type":"symbol","kind":"mesic","color":"#d6b067"}]}`, false},
		{"valid stat element", ValidateContent, `{"elements":[{"type":"stat","kind":"stit","text":"Útok","value":"5"}]}`, false},
		{"unknown element type", ValidateContent, `{"elements":[{"type":"video"}]}`, true},
		{"unknown symbol", ValidateContent, `{"elements":[{"type":"symbol","kind":"logo"}]}`, true},
		{"unknown ornament", ValidateContent, `{"elements":[{"type":"ornament","kind":"mesic"}]}`, true},
		{"unknown side", ValidateContent, `{"elements":[{"type":"text","side":"edge"}]}`, true},
		{"element far off the card", ValidateContent, `{"elements":[{"type":"text","x":500}]}`, true},
		{"element too big", ValidateContent, `{"elements":[{"type":"shape","size":151}]}`, true},
		{"element text too long", ValidateContent, `{"elements":[{"type":"text","text":"` + strings.Repeat(long, 2) + `"}]}`, true},
		{"element colour in another form", ValidateContent, `{"elements":[{"type":"text","color":"url(x)"}]}`, true},
		{"element hidden of a wrong type", ValidateContent, `{"elements":[{"type":"text","hidden":1}]}`, true},
		{"artist too long", ValidateContent, `{"artist":"` + long + `"}`, true},
		{"valid back text and labels", ValidateContent, `{"backText":"Moje sada","labels":{"level":"LV","s1":"Útok","s2":"Štít","s3":"Mana"}}`, false},
		{"back text too long", ValidateContent, `{"backText":"` + long + `"}`, true},
		{"label too long", ValidateContent, `{"labels":{"s1":"` + long + `"}}`, true},
		{"labels of a wrong type", ValidateContent, `{"labels":"Útok"}`, true},
		{"valid element styling", ValidateContent, `{"elements":[{"type":"text","depth":-40,"shadow":50,"blend":"screen","flipX":true,"flipY":false,"locked":true,"spacing":10,"line":140,"caps":true,"curve":-60,"effect":"obrys"}]}`, false},
		{"valid image cut-out", ValidateContent, `{"elements":[{"type":"image","mask":"kruh","border":4},{"type":"image","mask":""}]}`, false},
		{"valid outline width", ValidateContent, `{"elements":[{"type":"shape","kind":"stuha","filled":false,"stroke":8}]}`, false},
		{"unknown blend", ValidateContent, `{"elements":[{"type":"text","blend":"dissolve"}]}`, true},
		{"unknown text effect", ValidateContent, `{"elements":[{"type":"text","effect":"blikani"}]}`, true},
		{"unknown cut-out", ValidateContent, `{"elements":[{"type":"image","mask":"logo"}]}`, true},
		{"depth above the range", ValidateContent, `{"elements":[{"type":"shape","depth":101}]}`, true},
		{"shadow above the range", ValidateContent, `{"elements":[{"type":"shape","shadow":101}]}`, true},
		{"curve below the range", ValidateContent, `{"elements":[{"type":"text","curve":-101}]}`, true},
		{"outline width above the range", ValidateContent, `{"elements":[{"type":"shape","stroke":13}]}`, true},
		{"mirror of a wrong type", ValidateContent, `{"elements":[{"type":"shape","flipX":"ano"}]}`, true},
		{"lock of a wrong type", ValidateContent, `{"elements":[{"type":"shape","locked":1}]}`, true},

		{"valid meaning", ValidateMeaning, `{"arcana":"mala","upright":"","keywords":["a","b"]}`, false},
		{"unknown arcana", ValidateMeaning, `{"arcana":"stredni"}`, true},
		{"keyword too long", ValidateMeaning, `{"keywords":["` + long + `"]}`, true},
		{"keywords of a wrong type", ValidateMeaning, `{"keywords":"a"}`, true},

		{"valid transform", ValidateArtworkTransform, `{"x":-10,"y":20,"zoom":1.5,"layers":[{"x":0,"y":0,"zoom":1}]}`, false},
		{"zoom below the range", ValidateArtworkTransform, `{"zoom":0.5}`, true},
		{"offset above the range", ValidateArtworkTransform, `{"x":101}`, true},
		{"too many layers", ValidateArtworkTransform, `{"layers":[{},{},{},{}]}`, true},
		{"valid rotation and mirror", ValidateArtworkTransform, `{"rotate":90,"flipX":true,"layers":[{"rotate":-90,"flipX":false}]}`, false},
		{"rotation above the range", ValidateArtworkTransform, `{"rotate":181}`, true},
		{"mirror of a wrong type", ValidateArtworkTransform, `{"layers":[{"flipX":"ano"}]}`, true},

		{"valid deck back", ValidateDeckBack, `{"palette":"krev","edge":"zlata"}`, false},
		{"unknown deck palette", ValidateDeckBack, `{"palette":"modra"}`, true},
	}

	for _, s := range scenarios {
		t.Run(s.name, func(t *testing.T) {
			problems := s.validate(parse(t, s.value))
			if s.invalid && len(problems) == 0 {
				t.Error("expected a problem, got none")
			}
			if !s.invalid && len(problems) > 0 {
				t.Errorf("expected no problems, got %v", problems)
			}
		})
	}
}
