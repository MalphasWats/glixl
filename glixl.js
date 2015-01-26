/* glixl
	Incredibly basic webgl based 2D sprite engine.
*/

var glixl = (function(glixl)
{
	
	glixl.initialise = function(app)
	{
		glixl.DEFAULT_VERTEX_SHADER = "attribute vec2 a_position; attribute vec2 a_texCoords; uniform mat3 u_matrix; varying vec2 v_texCoords; void main() { gl_Position = vec4((u_matrix * vec3(a_position, 1)).xy, 0, 1); v_texCoords = a_texCoords; }";
		glixl.DEFAULT_FRAGMENT_SHADER = "precision mediump float;	uniform sampler2D u_image; varying vec2 v_texCoords; void main() { gl_FragColor = texture2D(u_image, v_texCoords); }";
		
		glixl.BASIC_VERTEX_SHADER = "attribute vec2 a_position; uniform mat3 u_matrix; void main() { gl_Position = vec4((u_matrix * vec3(a_position, 1)).xy, 0, 1); }";
		glixl.BASIC_FRAGMENT_SHADER = "void main() { gl_FragColor = vec4(0,1,0,1); }";
		
		glixl.canvas = document.getElementsByTagName('canvas')[0];
		if (!glixl.canvas)
			throw new Error("*** ERROR: Could not find canvas element");
			
		glixl.context = glixl.canvas.getContext("webgl");
		if (!glixl.context)
		{
			glixl.context = glixl.canvas.getContext("experimental-webgl");
			if (!glixl.context)
				throw new Error("*** ERROR: Unable to create webgl context");
		}
		
		/* Set texture transparency */	
		glixl.context.blendFunc(glixl.context.SRC_ALPHA, glixl.context.ONE_MINUS_SRC_ALPHA);
		glixl.context.enable ( glixl.context.BLEND ) ;
		
		/* Set up shaders */
		glixl.shaders = [];
		glixl.shaders.push(glixl.create_shader(glixl.DEFAULT_VERTEX_SHADER, 'x-shader/x-vertex'));
		glixl.shaders.push(glixl.create_shader(glixl.DEFAULT_FRAGMENT_SHADER, 'x-shader/x-fragment'));
		
		glixl.program = glixl.create_program(glixl.shaders);
		glixl.context.useProgram(glixl.program);
		
		glixl.DEFAULT_TEXTURE = glixl.context.createTexture();
		glixl.context.bindTexture(glixl.context.TEXTURE_2D, glixl.DEFAULT_TEXTURE);
		glixl.context.texImage2D(glixl.context.TEXTURE_2D, 0, glixl.context.RGBA, 1, 1, 0, glixl.context.RGBA, glixl.context.UNSIGNED_BYTE, new Uint8Array([255, 0, 255, 255])); // fuschia
		glixl.bound_texture = glixl.DEFAULT_TEXTURE;
		
		glixl.position_attribute = glixl.context.getAttribLocation(glixl.program, "a_position");
		glixl.context.enableVertexAttribArray(glixl.position_attribute);
		
		glixl.texture_coordinates = glixl.context.getAttribLocation(glixl.program, "a_texCoords");
		glixl.context.enableVertexAttribArray(glixl.texture_coordinates);
		
		glixl.matrix = glixl.context.getUniformLocation(glixl.program, "u_matrix");
		
		
		glixl.PROJECTION_MATRIX = [
			2 / glixl.canvas.clientWidth, 0, 0,
		    0, -2 / glixl.canvas.clientHeight, 0,
		    -1, 1, 1
		];
		
		/* Set up input */
		window.addEventListener("keydown", glixl.handle_key_down);
		window.addEventListener("keyup", glixl.handle_key_up);
		
		glixl.keys = {};
		
		
		glixl.scene = new glixl.Scene();
		
		
		glixl.prevTS = 0;
		glixl.fps_stream = [];
		glixl.fps = 0;
		
		/* Initialise the app */
		glixl.app = app;
		glixl.app.init();
	}
	
	glixl.start = function(app)
	{
		//TODO allow objects to be passed in.
		glixl.initialise(new app);
		
		glixl.app_loop = function(ts)
		{
			glixl.update_fps(ts);
			
			glixl.update();
			glixl.app.update();
			
			glixl.render();
			window.requestAnimationFrame(glixl.app_loop);
		}
		
		window.requestAnimationFrame(glixl.app_loop);
		
	}
	
	glixl.update = function()
	{
	
	}
	
	glixl.update_fps = function(ts)
	{
		var delta = ts - glixl.prevTS;
		glixl.prevTS = ts;
		
		glixl.fps_stream.unshift(1000 / delta);
		glixl.fps_stream = glixl.fps_stream.slice(0, 20);
		var sum = 0;
		for (var i=0 ; i<20 ; i++)
			sum += glixl.fps_stream[i];
			
		glixl.fps = Math.round(sum/20);
	}
	
	glixl.render = function()
	{
		this.scene.render();
	}
	
	glixl.add_to_scene = function(object)
	{
		glixl.scene.add_sprite(object);
	}
	
	
	/* Scene
	
														*/
	glixl.Scene = function Scene(parameters)
	{
		this.sprites = [];
		
		this.tilemap = {};
		
		this.viewport = {
			x: 0,
			y: 0,
			width:  glixl.canvas.clientWidth,
			height: glixl.canvas.clientHeight,
			max_x: 0,
			max_y: 0
		};
		
		this.global_translation_matrix = glixl.makeTranslation(-this.viewport.x, -this.viewport.y);
		
		this.redraw = true;
	}
	
	glixl.Scene.prototype.add_sprite = function(sprite)
	{
		sprite.scene_index = this.sprites.push(sprite) - 1;
	}
	
	glixl.Scene.prototype.remove_sprite = function(sprite)
	{
		delete this.sprites[sprite.scene_index];
	}
	
	glixl.Scene.prototype.set_active_tilemap = function(tilemap)
	{
		this.tilemap = tilemap;
		
		this.viewport.x = 0;
		this.viewport.y = 0;
		this.viewport.max_x = (tilemap.tile_width * tilemap.scale * tilemap.columns) - this.viewport.width;
		this.viewport.max_y = (tilemap.tile_height * tilemap.scale * tilemap.rows) - this.viewport.height;
		
		this.tilemap.redraw = true;
	}
	
	glixl.Scene.prototype.center_on = function(object)
	{
		if (object.x && object.y)
		{
			var prev_x = this.viewport.x;
			var prev_y = this.viewport.y;
			this.viewport.x = Math.floor(object.x - this.viewport.width / 2);
			this.viewport.y = Math.floor(object.y - this.viewport.height / 2);
		}
		if (this.viewport.x < 0)
			this.viewport.x = 0;
		if (this.viewport.y < 0)
			this.viewport.y = 0;
		if (this.viewport.x > this.viewport.max_x)
			this.viewport.x = this.viewport.max_x;
		if (this.viewport.y > this.viewport.max_y)
			this.viewport.y = this.viewport.max_y;
			
		this.global_translation_matrix = glixl.makeTranslation(-this.viewport.x, -this.viewport.y);
		
		if (prev_x != this.viewport.x || prev_y != this.viewport.y)
		{
			this.redraw = true;
		}
	}
	
	glixl.Scene.prototype.is_visible = function(object)
	{
		if (object.x+object.width > this.viewport.x && object.x-object.width < this.viewport.x+this.viewport.width &&
			object.y+object.height > this.viewport.y && object.y-object.height < this.viewport.y+this.viewport.height)
		{
			return true;
		}
		return false;
	}
	
	glixl.Scene.prototype.render = function()
	{
		this.tilemap.render();
	
		for(var i=0 ; i<this.sprites.length ; i++)
		{
			if (this.sprites[i] && this.is_visible(this.sprites[i]))
				this.sprites[i].render();
		}
		this.redraw = false;
	}
	
	/* Sprite
	
														*/
	glixl.Sprite = function Sprite(parameters)
	{
		//TODO: pass in src of image, new spritesheet made.
		if (!parameters.sprite_sheet)
			throw new Error("*** Error: no sprite sheet specified for sprite.");
		if (!parameters.size)
			throw new Error("*** Error: size not specified for sprite.");
			
		this.sprite_sheet = parameters.sprite_sheet;
		
		if (parameters.animation_frames)
		{
			this.animation = new glixl.Animation({frames:parameters.animation_frames, 
												  frame_duration: (parameters.animation_frame_duration || 60)
												});
			this.frame = this.animation.next();
		}
		else if (parameters.animation)
		{
			this.animation = parameters.animation;
			this.frame = this.animation.next();
		}
		else
		{
			this.frame = parameters.frame || 0;
		}
			
		this.x = parameters.x || 0;
		this.y = parameters.y || 0;
		
		this.width = parameters.size[0];
		this.height = parameters.size[1];
		
		this.angle = parameters.angle || 0;
		this.scale = parameters.scale || 1;
		
		this.redraw = true;
		
		this.buffer = glixl.context.createBuffer();
		glixl.context.bindBuffer(glixl.context.ARRAY_BUFFER, this.buffer);
		this.position_coordinates = [
			0, 0,
			0+this.width, 0,
			0, 0+this.height,
			0, 0+this.height,
			0+this.width, 0,
			0+this.width, 0+this.height];
		
		this.texture_coordinates = this.sprite_sheet.get_coordinates_for_frame(this.frame);
	}
	
	glixl.Sprite.prototype.render = function()
	{
		glixl.context.bindBuffer(glixl.context.ARRAY_BUFFER, this.buffer);
		
		var loaded = this.sprite_sheet.bind_texture();
		if (loaded && !this.texture_loaded)
		{
			this.redraw = true;
			this.texture_loaded = true;
			this.texture_coordinates = this.sprite_sheet.get_coordinates_for_frame(this.frame);
		}
		
		if (this.redraw || glixl.scene.redraw)
		{
			var index = 0;
			var coords = [];
			
			coords[index++] = this.position_coordinates[0];
			coords[index++] = this.position_coordinates[1];
			coords[index++] = this.texture_coordinates[0];
			coords[index++] = this.texture_coordinates[1];
			coords[index++] = this.position_coordinates[2];
			coords[index++] = this.position_coordinates[3];
			coords[index++] = this.texture_coordinates[2];
			coords[index++] = this.texture_coordinates[3];
			coords[index++] = this.position_coordinates[4];
			coords[index++] = this.position_coordinates[5];
			coords[index++] = this.texture_coordinates[4];
			coords[index++] = this.texture_coordinates[5];
			coords[index++] = this.position_coordinates[6];
			coords[index++] = this.position_coordinates[7];
			coords[index++] = this.texture_coordinates[6];
			coords[index++] = this.texture_coordinates[7];
			coords[index++] = this.position_coordinates[8];
			coords[index++] = this.position_coordinates[9];
			coords[index++] = this.texture_coordinates[8];
			coords[index++] = this.texture_coordinates[9];
			coords[index++] = this.position_coordinates[10];
			coords[index++] = this.position_coordinates[11];
			coords[index++] = this.texture_coordinates[10];
			coords[index++] = this.texture_coordinates[11];
			
			glixl.context.bufferData(glixl.context.ARRAY_BUFFER, new Float32Array(coords), glixl.context.STATIC_DRAW);
		
			var angleInRadians = this.angle * Math.PI / 180;
			
			var moveOriginMatrix = glixl.makeTranslation(-this.width/2, -this.height/2);
			
			var translationMatrix = glixl.makeTranslation(this.x, this.y);
			var rotationMatrix = glixl.makeRotation(angleInRadians);
			var scaleMatrix = glixl.makeScale(this.scale, this.scale);
			
			// Multiply the matrices.
			var matrix = glixl.multiply_matrix(moveOriginMatrix, scaleMatrix);
			matrix = glixl.multiply_matrix(matrix, rotationMatrix);
			matrix = glixl.multiply_matrix(matrix, translationMatrix);
			matrix = glixl.multiply_matrix(matrix, glixl.scene.global_translation_matrix);
			matrix = glixl.multiply_matrix(matrix, glixl.PROJECTION_MATRIX);
			
			this.matrix = matrix;
			
			this.redraw = false;
		}
		
		glixl.context.vertexAttribPointer(glixl.position_attribute, 2, glixl.context.FLOAT, false, 16, 0);
		glixl.context.vertexAttribPointer(glixl.texture_coordinates, 2, glixl.context.FLOAT, false, 16, 8);
	    // Set the matrix.
	    glixl.context.uniformMatrix3fv(glixl.matrix, false, this.matrix);
		
		glixl.context.drawArrays(glixl.context.TRIANGLES, 0, 6);
	}
	
	glixl.Sprite.prototype.update = function()
	{
		//
	}
	
	glixl.Sprite.prototype.set_frame = function(frame)
	{
		this.frame = frame;
		this.texture_coordinates = this.sprite_sheet.get_coordinates_for_frame(this.frame);
		this.redraw = true;
	}
	
	glixl.Sprite.prototype.next_frame = function()
	{
		if (this.animation)
		{
			this.set_frame(this.animation.next());
			this.redraw = true;
		}
	}
	
	glixl.Sprite.prototype.set_animation = function(animation)
	{
		this.animation = animation;
		this.next_frame();
	}
	
	/* Animation
	
														*/
	glixl.Animation = function Animation(parameters)
	{
		this.frames = parameters.frames;
		this.frame_duration = parameters.frame_duration || 60;
		this.index = 0;
		this.timestamp = (new Date()).getTime();
		this.time_since_last_frame = 0;
	}
	
	glixl.Animation.prototype.next = function()
	{
		return this.update();
	}
	
	glixl.Animation.prototype.update = function()
	{
		var ts = (new Date()).getTime();
		this.time_since_last_frame += (ts - this.timestamp);
		this.timestamp = ts;

		if(this.time_since_last_frame > this.frame_duration)
		{
			this.time_since_last_frame = 0;
			this.index += 1;
			if (this.index >= this.frames.length)
				this.index = 0;
			
		}

		return this.frames[this.index];
	}
	
	glixl.Animation.prototype.get_current_frame = function()
	{
		return this.frames[this.index];
	}
	
	/* SpriteSheet
	
														*/
	glixl.SpriteSheet = function SpriteSheet(parameters)
	{
		if (!parameters.src)
			throw new Error("*** Error: SpriteSheet defined without src");
		if (!parameters.frame_size)
			throw new Error("*** Error: SpriteSheet defined without frame size");
		this.src = parameters.src;
		
		this.frame_width = parameters.frame_size[0];
		this.frame_height = parameters.frame_size[1];
		
		this.texture = glixl.DEFAULT_TEXTURE;
		
		this.texture_coordinate_cache = [];
		
		var image = new Image();
		image.src = this.src;
		image.sprite_sheet = this;
		image.onload = function() 
		{
			console.log('Texture loaded: ', this.src);
			this.sprite_sheet.texture_width = this.width;
			this.sprite_sheet.texture_height = this.height;
			
			if (this.sprite_sheet.frame_width == 0)
				this.sprite_sheet.frame_width = this.width;
			if (this.sprite_sheet.frame_height == 0)
				this.sprite_sheet.frame_height = this.height;

			try 
			{
				this.sprite_sheet.texture = glixl.context.createTexture();
				this.sprite_sheet.bind_texture();
			
				// TODO: allow for ^2 textures with mips (need to check benefit with using parts of texture
				glixl.context.texParameteri(glixl.context.TEXTURE_2D, glixl.context.TEXTURE_WRAP_S, glixl.context.CLAMP_TO_EDGE);
				glixl.context.texParameteri(glixl.context.TEXTURE_2D, glixl.context.TEXTURE_WRAP_T, glixl.context.CLAMP_TO_EDGE);
				glixl.context.texParameteri(glixl.context.TEXTURE_2D, glixl.context.TEXTURE_MIN_FILTER, glixl.context.NEAREST);
				glixl.context.texParameteri(glixl.context.TEXTURE_2D, glixl.context.TEXTURE_MAG_FILTER, glixl.context.NEAREST);
				glixl.context.texImage2D(glixl.context.TEXTURE_2D, 0, glixl.context.RGBA, glixl.context.RGBA, glixl.context.UNSIGNED_BYTE, this);
				
				var cols = Math.ceil(this.width/this.sprite_sheet.frame_width);
				var rows = Math.ceil(this.height/this.sprite_sheet.frame_height);
			
				for (var frame=0 ; frame<cols*rows ; frame++)
				{
					this.sprite_sheet.texture_coordinate_cache.push(this.sprite_sheet.get_coordinates_for_frame(frame));
				}
			}
			catch (error) 
			{
				console.log("*** Error: Unable to create texture");
				this.sprite_sheet.texture = glixl.DEFAULT_TEXTURE;
			}
			
		}
	}
	
	glixl.SpriteSheet.prototype.get_coordinates_for_frame = function(frame)
	{
		if (this.texture === glixl.DEFAULT_TEXTURE)
		{
			return [0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1];
		}
		else
		{
			if (this.texture_coordinate_cache[frame])
			{
				return this.texture_coordinate_cache[frame];
			}
			else
			{
				var w = this.texture_width / this.frame_width;
				var h = this.texture_height / this.frame_height;
				
				var row = Math.floor(frame / w);
				var col = frame % w;
				
				var tex_x_step = 1 / w;
				var tex_y_step = 1 / h;
				
				var x = col*tex_x_step;
				var y = row*tex_y_step;
				
				return [
					x, y,
					x+tex_x_step, y,
					x, y+tex_y_step,
					x, y+tex_y_step,
					x+tex_x_step, y,
					x+tex_x_step, y+tex_y_step
				];
			}
		}
	}
	
	glixl.SpriteSheet.prototype.bind_texture = function()
	{
		glixl.bind_texture(this.texture);
		
		if (this.texture !== glixl.DEFAULT_TEXTURE)
			return true;
		return false;
	}
	
	
	/* TileMap
	
														*/
	glixl.TileMap = function TileMap(parameters)
	{
		//TODO: pass in src of image, new spritesheet made.
		if (!parameters.sprite_sheet)
			throw new Error("*** Error: no sprite sheet specified for tile map.");
		if (!parameters.dimensions)
			throw new Error("*** Error: size not specified for tile map.");
			
		this.sprite_sheet = parameters.sprite_sheet;
		this.columns = parameters.dimensions[0];
		this.rows = parameters.dimensions[1];
		
		this.tile_width = this.sprite_sheet.frame_width;
		this.tile_height = this.sprite_sheet.frame_height;
		
		this.scale = parameters.scale || 1;
		
		this.map = parameters.map || [];
		
		
		this.buffer = glixl.context.createBuffer();
		this.matrix = glixl.PROJECTION_MATRIX;
		this.redraw = true;
	}
	
	glixl.TileMap.prototype.set_tile = function(row, col, tile)
	{
		this.map[this.columns*row+col] = tile;
	}
	
		
	glixl.TileMap.prototype.render = function()
	{
		var loaded = this.sprite_sheet.bind_texture();
		if (loaded && !this.texture_loaded)
		{
			this.redraw = true;
			this.texture_loaded = true;
		}
		
		if (this.redraw || glixl.scene.redraw)
		{
			glixl.context.bindBuffer(glixl.context.ARRAY_BUFFER, this.buffer);
			var vertices = [];
			var index = 0;
			var tile;
			this.visible_count = 0;
			
			for (var t=0 ; t<this.map.length ; t++)
			{
				if (typeof this.map[t] != 'undefined')
				{
					var c = Math.floor(t / this.columns);
					var r = t - (c*this.columns);
					
					var w = this.tile_width * this.scale;
					var h = this.tile_height * this.scale;
					
					var x = c * w;
					var y = r * h;
					
					if (glixl.scene.is_visible({x: x, y:y, width: w, height: h}))
					{
						this.visible_count += 1;
						
						var tx = this.sprite_sheet.get_coordinates_for_frame(this.map[t].frame);
					
						vertices[index++] = x;
						vertices[index++] = y;
						vertices[index++] = tx[0];
						vertices[index++] = tx[1];
						vertices[index++] = x+(this.tile_width * this.scale);
						vertices[index++] = y;
						vertices[index++] = tx[2];
						vertices[index++] = tx[3];
						vertices[index++] = x;
						vertices[index++] = y+this.tile_height * this.scale;
						vertices[index++] = tx[4];
						vertices[index++] = tx[5];
						vertices[index++] = x;
						vertices[index++] = y+this.tile_height * this.scale;
						vertices[index++] = tx[6];
						vertices[index++] = tx[7];
						vertices[index++] = x+this.tile_width * this.scale;
						vertices[index++] = y;
						vertices[index++] = tx[8];
						vertices[index++] = tx[9];
						vertices[index++] = x+this.tile_width * this.scale;
						vertices[index++] = y+this.tile_height * this.scale;
						vertices[index++] = tx[10];
						vertices[index++] = tx[11];
					}
				}
			}
			glixl.context.bufferData(glixl.context.ARRAY_BUFFER, new Float32Array(vertices), glixl.context.DYNAMIC_DRAW);
			
			delete vertices;
			
			glixl.context.vertexAttribPointer(glixl.position_attribute, 2, glixl.context.FLOAT, false, 16, 0);	
			glixl.context.vertexAttribPointer(glixl.texture_coordinates, 2, glixl.context.FLOAT, false, 16, 8);
			
			this.matrix = glixl.multiply_matrix(glixl.scene.global_translation_matrix, glixl.PROJECTION_MATRIX);
			glixl.context.uniformMatrix3fv(glixl.matrix, false, this.matrix);
			
			this.redraw = false;
		}
		else
		{
			glixl.context.bindBuffer(glixl.context.ARRAY_BUFFER, this.buffer);
			this.sprite_sheet.bind_texture();
			glixl.context.vertexAttribPointer(glixl.position_attribute, 2, glixl.context.FLOAT, false, 16, 0);
			glixl.context.vertexAttribPointer(glixl.texture_coordinates, 2, glixl.context.FLOAT, false, 16, 8);
			
			this.matrix = glixl.multiply_matrix(glixl.scene.global_translation_matrix, glixl.PROJECTION_MATRIX);
			glixl.context.uniformMatrix3fv(glixl.matrix, false, this.matrix);
		}
		
		glixl.context.drawArrays(glixl.context.TRIANGLES, 0, this.visible_count * 6);
	}
	
	glixl.TileMap.prototype.collide = function(x, y)
	{
		var c = Math.floor(x/(this.tile_width * this.scale));
		var r = Math.floor(y/(this.tile_height * this.scale));
		if (c < 0 || c > this.columns-1 || r < 0 || r > this.rows-1)
			return false;
		if (this.map[this.columns*c+r])
			return this.map[this.columns*c+r].collidable;
		return false;
	}
	
	
	/* Tile
	
														*/
	glixl.Tile = function Tile(parameters)
	{
		if (!parameters.frame)
			throw new Error("*** Error: No frame index specified for tile.");
			
		this.frame = parameters.frame;
		this.collidable = parameters.collidable || false;
	}
	
	
	/* Helpers
		
														*/
	glixl.bind_texture = function(texture)
	{
		if (glixl.bound_texture != texture)
		{
			glixl.context.bindTexture(glixl.context.TEXTURE_2D, texture);
			glixl.bound_texture = texture;
		}
	}
	
	glixl.create_shader = function(source, type)
	{
		if (type == "x-shader/x-vertex")
		{
			type = glixl.context.VERTEX_SHADER;
		}
		else if (type == "x-shader/x-fragment")
		{
			type = glixl.context.FRAGMENT_SHADER;
		} 
		else
		{
			throw new Error("*** Error: Unknown shader type");
		}
		
		// Create the shader object
		var shader = glixl.context.createShader(type);

		// Load the shader source
		glixl.context.shaderSource(shader, source);

		// Compile the shader
		glixl.context.compileShader(shader);

		// Check the compile status
		var compiled = glixl.context.getShaderParameter(shader, glixl.context.COMPILE_STATUS);
		if (!compiled) 
		{
			glixl.context.deleteShader(shader);
			var lastError = glixl.context.getShaderInfoLog(shader);
			throw new Error("*** Error: Could not compile shader '" + shader + "' : " + lastError);
		}

		return shader;
	}
	
	glixl.create_program = function(shaders)
	{
		var program = glixl.context.createProgram();
		for (var i = 0; i < shaders.length; i++) 
		{
			glixl.context.attachShader(program, shaders[i]);
		}
		
		glixl.context.linkProgram(program);

		// Check the link status
		var linked = glixl.context.getProgramParameter(program, glixl.context.LINK_STATUS);
		if (!linked) 
		{
			// something went wrong with the link
			glixl.context.deleteProgram(program);
			var lastError = glixl.context.getProgramInfoLog(program);
			throw new Error("*** Error: Could not link program: " + lastError);
		}
		return program;
	}
	
	glixl.multiply_matrix = function(matrix_a, matrix_b)
	{
		var matrix_c = [];
		for (var a_r=0 ; a_r < 3 ; a_r++)
		{
			for (var b_c=0 ; b_c < 3 ; b_c++)
			{
				matrix_c.push( matrix_a[a_r*3] * matrix_b[b_c] + 
							   matrix_a[a_r*3+1] * matrix_b[b_c+3] + 
							   matrix_a[a_r*3+2] * matrix_b[b_c+6] );
			}
		}
		return matrix_c;
	}
		
	glixl.makeTranslation = function(tx, ty) 
	{
		return [
			1,  0, 0,
			0,  1, 0,
			tx, ty, 1
		];
	}
		
	glixl.makeRotation = function(angleInRadians) 
	{
		var c = Math.cos(angleInRadians);
		var s = Math.sin(angleInRadians);
		return [
			c,-s, 0,
			s, c, 0,
			0, 0, 1
		];
	}
		
	glixl.makeScale = function(sx, sy) 
	{
		return [
			sx, 0, 0,
			0, sy, 0,
			0, 0, 1
		];
	}
	
	
	glixl.KEYBOARD_MAP = ["","","","CANCEL","","","HELP","","BACK_SPACE","TAB","","","CLEAR",
						   "ENTER","RETURN","","SHIFT","CONTROL","ALT","PAUSE","CAPS_LOCK","KANA",
						   "EISU","JUNJA","FINAL","HANJA","","ESCAPE","CONVERT","NONCONVERT","ACCEPT",
						   "MODECHANGE","SPACE","PAGE_UP","PAGE_DOWN","END","HOME",
						   
						   "LEFT","UP","RIGHT","DOWN",
						   
						   "SELECT","PRINT","EXECUTE","PRINTSCREEN","INSERT","DELETE","",
						   
						   "0","1","2","3","4","5","6","7","8","9",
						   
						   "COLON","SEMICOLON","LESS_THAN","EQUALS","GREATER_THAN","QUESTION_MARK","AT",
						   
						   "A","B","C","D","E","F","G","H","I","J","K","L","M",
						   "N","O","P","Q","R","S","T","U","V","W","X","Y","Z",
						   
						   "WIN","","CONTEXT_MENU","","SLEEP",
						   
						   "NUMPAD0","NUMPAD1","NUMPAD2","NUMPAD3","NUMPAD4",
						   "NUMPAD5","NUMPAD6","NUMPAD7","NUMPAD8","NUMPAD9",
						   
						   "MULTIPLY","ADD","SEPARATOR","SUBTRACT","DECIMAL","DIVIDE",
						   
						   "F1","F2","F3","F4","F5","F6","F7","F8","F9","F10","F11","F12",
						   "F13","F14","F15","F16","F17","F18","F19","F20","F21","F22","F23","F24",
						   
						   "","","","","","","","","NUM_LOCK","SCROLL_LOCK","WIN_OEM_FJ_JISHO",
						   "WIN_OEM_FJ_MASSHOU","WIN_OEM_FJ_TOUROKU","WIN_OEM_FJ_LOYA","WIN_OEM_FJ_ROYA",
						   "","","","","","","","","","CIRCUMFLEX","EXCLAMATION","DOUBLE_QUOTE","HASH",
						   "DOLLAR","PERCENT","AMPERSAND","UNDERSCORE","OPEN_PAREN","CLOSE_PAREN",
						   "ASTERISK","PLUS","PIPE","HYPHEN_MINUS","OPEN_CURLY_BRACKET","CLOSE_CURLY_BRACKET",
						   "TILDE","","","","","VOLUME_MUTE","VOLUME_DOWN","VOLUME_UP","","","SEMICOLON",
						   "EQUALS","COMMA","MINUS","PERIOD","SLASH","BACK_QUOTE",
						   "","","","","","","","","","","","","","","","","","","","","","","","","","",
						   "OPEN_BRACKET","BACK_SLASH","CLOSE_BRACKET","QUOTE","","META","ALTGR","","WIN_ICO_HELP",
						   "WIN_ICO_00","","WIN_ICO_CLEAR","","","WIN_OEM_RESET","WIN_OEM_JUMP","WIN_OEM_PA1",
						   "WIN_OEM_PA2","WIN_OEM_PA3","WIN_OEM_WSCTRL","WIN_OEM_CUSEL","WIN_OEM_ATTN",
						   "WIN_OEM_FINISH","WIN_OEM_COPY","WIN_OEM_AUTO","WIN_OEM_ENLW","WIN_OEM_BACKTAB",
						   "ATTN","CRSEL","EXSEL","EREOF","PLAY","ZOOM","","PA1","WIN_OEM_CLEAR",""];
						   
	glixl.DEFAULT_KEYS = {
		SPACE: true,
		UP: true,
		DOWN: true,
		LEFT: true,
		RIGHT: true,
	};
	

	glixl.handle_key_down = function(e)
	{
		event = (e) ? e : window.event;
		if (glixl.DEFAULT_KEYS[glixl.KEYBOARD_MAP[event.keyCode]])
			event.preventDefault();
		
		glixl.keys[glixl.KEYBOARD_MAP[event.keyCode]] = true;
	}
		
	glixl.handle_key_up = function(e)
	{
		event = (e) ? e : window.event;
		event.preventDefault();
		delete glixl.keys[glixl.KEYBOARD_MAP[event.keyCode]];
	}

	glixl.key_pressed = function(key)
	{
		if (glixl.keys[key.toUpperCase()])
			return true;
		return false;
	}
	
	
	return glixl;
	
})(glixl || {});