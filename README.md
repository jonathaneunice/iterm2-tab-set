Tabset
------

Tabset is designed to make life easier for those
using iTerm2 on the Mac. It provides both a CLI
command and callable functions that allow the
easy setting of a terminal tab's title, badge,
and color. This is helpful when you have a lot
of tabs in operation simultaneously, and wish
to visually distinguish them.


Installation
------------

    npm install -g iterm2-tab-set

(Depending on local security settings, you may need
to use `sudo npm ...` to authorize global installation.)

Usage
-----

    tabset --color <colname>

where <colname> is the name of a CSS color. If
a color name is partially given (e.g. `ali`),
the corresponding color will be guessed (e.g.
`aliceblue`).  If more than one named CSS color
shares that name fragment, the possible matches
will be listed, and one of them will be chosen
at random. Note that fragments that exactly match
a color name (e.g. `blue`) will not enjoy such a
wildcard search; if you want to search on all
all possible blues, use a string like `blu` that
isn't itself an actual color name.

Special color names also recognized include `random`
(chooses a CSS color name at random) and
`RANDOM` (chooses an RGB color *completely*
at random, not just from the named CSS color
palette).

In many cases, you may not care what color is chosen
particularly, just that like terminal tabs are similarly
colored. In this case, you can use the `--hash` option.

    tabset --color --hash <word>

will choose a color based on a hash of
<word>. So if you want
all your JavaScript coding tabs to have one color,
`tabset --color --hash js` will do the trick. Other
words such as `css`, `html`, and `server` can be used
for other tabs and windows.
Any string can be used. Case *is* significant.
If you don't like the hashed selection, experiment with
variations. You might hate `--hash js`, but find
`--hash JS` or `--hash javascript` to be just right.

Config File
-----------

If you want to add named colors, that is possible.
Create a JSON file in your home directory called `.tabset`.

    {
      "colors": {
        "alisongreen": "rgb(125,199,53)",
        "js": "orchid",
        "html": "gold",
        "server": "alisongreen",
        "papayawhip": null
      }
    }

Now you can specify colors for `js`, `html`, and other purposes directly (using
existing color names or`rgb()` or hex CSS formats). You can add new
named colors, and use
them just like you would use one of the predefined base colors. For example here
a color `alisongreen` is defined, then the `server` color refers to
`alisongreen`. The only restriction is that color names
must be defined before they
are used. You can also redefine the default color, using the key `default`.
If you really don't like a color, and do not want it included in your
palette, you can remove it from service by defining its value as `null`.
The example above nixes `papayawhip`.
