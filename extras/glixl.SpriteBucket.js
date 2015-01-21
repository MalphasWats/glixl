/* SpriteBucket

														*/
var glixl = (function(glixl)
{
	glixl.SpriteBucket = function SpriteBucket(parameters)
	{
		this.redraw = true;
		
		this.sprites = [];
		this.visible_count = 0;
		
		this.buffer = null;
	}
	
	glixl.SpriteBucket.prototype.add_sprite = function(sprite)
	{
		this.sprites.push(sprite);
	}
	
	glixl.SpriteBucket.prototype.render = function()
	{
		if (this.redraw)
		{
			this.buffer = glixl.context.createBuffer();
			glixl.context.bindBuffer(glixl.context.ARRAY_BUFFER, this.buffer);
			var vertices = []
			var index = 0;
			var sprite;
			this.visible_count = 0;
			for (var s=0 ; s<this.sprites.length ; s++)
			{
				sprite = this.sprites[s];
				
				if (sprite.is_visible())
				{
					this.visible_count += 1;
					
					var tx = sprite.sprite_sheet.get_coordinates_for_frame(sprite.frame);
				
					vertices[index++] = sprite.x;
					vertices[index++] = sprite.y;
					vertices[index++] = tx[0];
					vertices[index++] = tx[1];
					vertices[index++] = sprite.x+sprite.width;
					vertices[index++] = sprite.y;
					vertices[index++] = tx[2];
					vertices[index++] = tx[3];
					vertices[index++] = sprite.x;
					vertices[index++] = sprite.y+sprite.height;
					vertices[index++] = tx[4];
					vertices[index++] = tx[5];
					vertices[index++] = sprite.x;
					vertices[index++] = sprite.y+sprite.height;
					vertices[index++] = tx[6];
					vertices[index++] = tx[7];
					vertices[index++] = sprite.x+sprite.width;
					vertices[index++] = sprite.y;
					vertices[index++] = tx[8];
					vertices[index++] = tx[9];
					vertices[index++] = sprite.x+sprite.width;
					vertices[index++] = sprite.y+sprite.height;
					vertices[index++] = tx[10];
					vertices[index++] = tx[11];
				}
			}
			glixl.context.bufferData(glixl.context.ARRAY_BUFFER, new Float32Array(vertices), glixl.context.DYNAMIC_DRAW);
			
			delete vertices;
			
			glixl.context.vertexAttribPointer(glixl.position_attribute, 2, glixl.context.FLOAT, false, 16, 0);
			
			//TODO: HORRIBLE
			this.sprites[0].sprite_sheet.bind_texture();
						
			glixl.context.vertexAttribPointer(glixl.texture_coordinates, 2, glixl.context.FLOAT, false, 16, 8);
			
			glixl.context.uniformMatrix3fv(glixl.matrix, false, glixl.PROJECTION_MATRIX);
			this.redraw = false;
			
			// ****TODO: HORRIBLE ****
			if (this.sprites[0].sprite_sheet.texture == glixl.DEFAULT_TEXTURE)
			{
				this.redraw = true;
			}
		}
		else
		{
			glixl.context.bindBuffer(glixl.context.ARRAY_BUFFER, this.buffer);
			this.sprites[0].sprite_sheet.bind_texture();
			glixl.context.vertexAttribPointer(glixl.position_attribute, 2, glixl.context.FLOAT, false, 16, 0);
			glixl.context.vertexAttribPointer(glixl.texture_coordinates, 2, glixl.context.FLOAT, false, 16, 8);
			
			glixl.context.uniformMatrix3fv(glixl.matrix, false, glixl.PROJECTION_MATRIX);
		}
		
		glixl.context.drawArrays(glixl.context.TRIANGLES, 0, this.visible_count * 6)// * 6);
	}
	
return glixl;
	
})(glixl || {});