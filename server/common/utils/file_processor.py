import base64
from fastapi import UploadFile
from typing import Optional


async def process_to_base64(
    file: UploadFile, 
    max_size_mb: int = 4) -> Optional[str]:
    
    if not file.content_type or not file.content_type.startswith('image/'):
        return None
    
    contents = await file.read()
    
    max_size_bytes = max_size_mb * 1024 * 1024
    if len(contents) > max_size_bytes:
        return None
    
    base64_encoded = base64.b64encode(contents).decode('utf-8')    
    data_url = f"data:{file.content_type};base64,{base64_encoded}"
    
    return data_url