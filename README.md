Tabset
------

Tabset is designed to make life easier for those
using iTerm2 on the Mac. It provides both a CLI
command that allows the
easy setting of a terminal tab's title, badge,
and color. This is helpful when you have a lot
of tabs in operation simultaneously, and wish
to visually distinguish them.


Installation
------------

    npm install -g iterm2-tab-set

(Depending on local security settings, you may need
to use `sudo npm ...` to authorize global installation.)
This will install the `tabset` command.

Usage
-----

    tabset --color <colorspec>

where <colorspec> is the name of a known color.
By default `tabset` knows all the CSS color names,
though you can add others if you like.

If a color name is partially given (e.g. `alice`),
the corresponding color will be guessed (e.g.
`aliceblue`).  If more than one named CSS color
shares that name fragment, the possible matches
will be listed, and one of them will be chosen
at random. Note that fragments that exactly match
a color name (e.g. `blue`) will not trigger a
search; if you want to search on all
all possible blues, use a string like `blu` that
isn't itself an actual color name.

You can see all of the color names with:

    tabset --colors

Special color names also recognized include `random`
(chooses a CSS color name at random) and
`RANDOM` (chooses an RGB color *completely*
at random, not just from the named CSS color
palette).

If you want to define your color precisely, that is possible
with either `rgb(x,y,z)` style or `#663399` hex style CSS
color specifications. `rgb` specs must be quoted to avoid
Unix shell ugliness, and hex style must be quoted if the
optional but traditional `#` prefix is used.

In many cases, you may not care exactly what color is
chosen, just that like terminal tabs are similarly
colored. In this case, you can use the `--hash` option.

    tabset --color --hash <word>

will choose a color based on a hash of <word>. So if
you want all your JavaScript coding tabs to have one color,
`tabset --color --hash js` will do the trick. Other
words such as `css`, `html`, and `server` can be used
for other tabs and windows.
Any string can be used. Case *is* significant.
If you don't like the hashed selection, experiment with
variations. You might hate `--hash js`, but find
`--hash JS` or `--hash javascript` to be just right.

Titles and Badges
-----------------

Beyond being distinguished by color, iTerm2 tabs can also
have titles and badges. Titles appear
in either the tab bar or on the window title. Badges are
a large-font watermark that appears behind the tab's normal
content. (Badges require a recent version of iTerm2: Version 3
or later.)

    tabset --badge "server 1"

Sets the badge watermark to "server 1". The quotes are needed
to manage the Unix shell argument handling. Single word badges
and titles do not need to be quoted, but any that include spaces
should be. You can also embed newlines into badges with `\n`.
Unicode characters are also possible (easiest with cut-and-paste,
since Unicode codepoints are difficult to specify in many shells).

To set tab titles:

    tabset --title server

iTerm2 has a complex system of tab title, window title, or both,
controlled with a mode flag. You can specify this with `--mode`
values of 0, 1, or 2, if you are so inclined. The default, modeless
operation will often suffice.


Config File
-----------

If you want to add your own named colors, create a JSON file
in your home directory called `.tabset`.

Give it a `colors` map, like so:

    {
      "colors": {
        "alisongreen": "rgb(125,199,53)",
        "js": "orchid",
        "html": "gold",
        "server": "alisongreen",
        "papayawhip": null
      }
    }

Now new colors are defined for `js`, `html`, and other names. They can be
defined in terms of existing color names (making them, in effect, aliases),
or through direct `rgb()` or hex CSS formats.

Once you've added a named color, you use it just like you would use one of
the predefined CSS color names. For example here a color `alisongreen` is
defined, then the `server` color refers to `alisongreen`. The only
restriction is that color names must be defined before they are used.

If you really don't like a color, and do not want it included in your
palette, you can remove it from service by defining its value as `null`. The
example above nixes `papayawhip`.

Finally, can also redefine the default color, using the key `default`.

