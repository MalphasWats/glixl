var glixl = (function(glixl)
{
    glixl.SpriteSheet = function SpriteSheet(parameters)
    {
        if (!parameters.context)
            throw new Error("*** GLIXL ERROR: No gl context provided to SpriteSheet");
            
        this.context = parameters.context;
        this.src = parameters.src || '';
        
        this.frame_width = 0
        this.frame_height = 0
        if (parameters.frame_size)
        {
            this.frame_width = parameters.frame_size[0];
            this.frame_height = parameters.frame_size[1];
        }
        
        this.texture = this.context.createTexture();
        this.context.bindTexture(this.context.TEXTURE_2D, this.texture);
        this.context.texImage2D(this.context.TEXTURE_2D, 0, this.context.RGBA, 1, 1, 0, this.context.RGBA, this.context.UNSIGNED_BYTE, new Uint8Array([255, 0, 255, 255])); // fuschia
        
        this.texture_coordinates = [[0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]];
        
        this.loaded = false;
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
                var ctx = this.sprite_sheet.context;
                
                // TODO: allow for ^2 textures with mips (need to check benefit with using parts of texture
                ctx.texParameteri( ctx.TEXTURE_2D, 
                                   ctx.TEXTURE_WRAP_S, 
                                   ctx.CLAMP_TO_EDGE    );
                                                         
                ctx.texParameteri( ctx.TEXTURE_2D, 
                                   ctx.TEXTURE_WRAP_T, 
                                   ctx.CLAMP_TO_EDGE    );
                                   
                ctx.texParameteri( ctx.TEXTURE_2D, 
                                   ctx.TEXTURE_MIN_FILTER, 
                                   ctx.NEAREST              );
                                   
                ctx.texParameteri( ctx.TEXTURE_2D, 
                                   ctx.TEXTURE_MAG_FILTER, 
                                   ctx.NEAREST              );
                                   
                ctx.texImage2D( ctx.TEXTURE_2D, 0, ctx.RGBA, ctx.RGBA, ctx.UNSIGNED_BYTE, this );
                
                var cols = Math.ceil(this.width/this.sprite_sheet.frame_width);
                var rows = Math.ceil(this.height/this.sprite_sheet.frame_height);
            
                this.sprite_sheet.texture_coordinates = [];
                for (var frame=0 ; frame<cols*rows ; frame++)
                {
                    var w = this.width / this.sprite_sheet.frame_width;
                    var h = this.height / this.sprite_sheet.frame_height;
                    
                    var row = Math.floor(frame / w);
                    var col = frame % w;
                    
                    var tex_x_step = 1 / w;
                    var tex_y_step = 1 / h;
                    
                    var x = col*tex_x_step;
                    var y = row*tex_y_step;
                    
                    
                    this.sprite_sheet.texture_coordinates.push([
                        x, y,
                        x+tex_x_step, y,
                        x, y+tex_y_step,
                        x, y+tex_y_step,
                        x+tex_x_step, y,
                        x+tex_x_step, y+tex_y_step
                    ]);
                }
            }
            catch (error) 
            {
                console.log("*** GLIXL WARNING: Unable to create texture");
            }
            this.sprite_sheet.loaded = true
        }
        
        glixl.SpriteSheet.prototype.get_texture_coordinates = function(frame)
        {
            if (!this.loaded)
            {
                return this.texture_coordinates[0];
            }
            return this.texture_coordinates[frame];
        }
        
        glixl.SpriteSheet.prototype.bind = function()
        {
            this.context.bindTexture(this.context.TEXTURE_2D, this.texture);
        }
        
    }
    
    return glixl;
    
})(glixl || {});