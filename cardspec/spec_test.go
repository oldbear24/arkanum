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
