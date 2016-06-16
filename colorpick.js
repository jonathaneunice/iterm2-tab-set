const runApplescript = require('run-applescript');

var bits8to16 = x => Math.round(x * 65535 / 255),
    bits16to8 = x => Math.round(255 * x / 65535);

function colorPicker(options, callback) {
  opts = Object.assign({ rgb: [125,199,53],
                         targetApp: 'Finder'
                       }, options);
  if (!opts.rgb16)
    opts.rgb16 = opts.rgb.map(bits8to16);

  var defCol = "{" + opts.rgb16.join(",") + "}";

  var ascript = `
    tell application "${opts.targetApp}"
      activate
      choose color default color ${defCol}
    end tell
  `;

  runApplescript(ascript).then(result => {
    var res = {};
    res.rgb16 = result.trim()
                      .split(/\s*,\s*/)
                      .map(x => parseInt(x));
    res.rgb = res.rgb16.map(bits16to8);
    callback(res);
  })

}


colorPicker.bits16to8 = bits16to8;
colorPicker.bits8to16 - bits8to16;

exports = module.exports = colorPicker;