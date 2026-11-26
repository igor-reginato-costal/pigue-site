precision highp float;
uniform sampler2D relief;
uniform vec2 crop;
uniform vec2 axis;
uniform vec2 pixel;
varying vec2 uv;

vec3 shade(vec2 at) {
  vec3 plate = texture2D(relief, at).rgb;
  vec2 n = plate.rg - 0.5;
  // A broad studio reflection and a narrow strip reflected by each cut face.
  float x = dot(n, axis);
  float y = dot(n, vec2(-axis.y, axis.x));
  float broad = exp(-((y-.37)*(y-.37)/.065+x*x/.10))
              + .35*exp(-((y+.37)*(y+.37)/.065+x*x/.10));
  float strip = exp(-((y-.36)*(y-.36)/.012+(x-.08)*(x-.08)/.030));
  float glint = exp(-((y-.36)*(y-.36)/.004+(x-.12)*(x-.12)/.009));
  float radius = length((at-vec2(.5,.474))*vec2(2., 4./3.));
  float exposure = mix(.30,1.,smoothstep(0.,.32,radius))*(1.-.20*min(radius,1.));
  vec3 green = vec3(.018,.075,.064) + (.55+.40*n.x-.65*n.y)*vec3(.035,.105,.082);
  vec3 reflections = broad*vec3(.045,.18,.135)+strip*vec3(.115,.28,.20)+glint*vec3(.19,.22,.185);
  return (green+exposure*reflections)*(.74+.26*sqrt(plate.b));
}

void main() {
  vec2 at = (uv - 0.5) * crop + 0.5;
  // Average the reflected colors across each pixel, after lighting the facets.
  vec2 a = pixel * vec2(.375,.125);
  vec2 b = pixel * vec2(-.125,.375);
  gl_FragColor = vec4(.25*(shade(at+a)+shade(at-a)+shade(at+b)+shade(at-b)),1.);
}
