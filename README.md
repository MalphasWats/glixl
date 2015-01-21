# glixl

Glixl is a super-basic 2D sprite/tile engine, very heavily influenced by the fantastic
[jaws.js](https://github.com/ippa/jaws), but using webgl rather than 2d-canvas.

Currently includes basic support for:
* Sprites
* Sprite sheets
* Basic animations
* Tile maps 
* Scrolling viewport
* Tile map collision
* Keyboard controls

Still to do:

* Mouse & touch input
* Animated tiles
* SpriteBucket example
* Lots of stuff as I have ideas!

I also included an extra: SpriteBuckets, which allow very large numbers of sprites to 
be drawn whilst keeping performance, best used in batches of ~500, tested with ~10000 
sprites in total for reasonable performance.

Glixl has enough functionality at this stage to make simple games.