var glixl = (function(glixl)
{
    glixl.TileSet = function TileSet(parameters)
    {
        this.x = parameters.x || 0;
        this.y = parameters.y || 0;
        this.z = parameters.z || 0;
        
        this.width = parameters.width || 16;
        this.height = parameters.height || 16;
        
        //this.frame = parameters.frame || 0;
        
        this.tiles = parameters.tiles || [];
    }
    
    glixl.TileSet.prototype.update = function()
    {
        
    }
    
    glixl.TileSet.prototype.use = function()
    {
        
    }
    
    return glixl;
    
})(glixl || {});