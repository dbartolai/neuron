# app/utils/supabase.py
import os
from supabase import create_client, Client

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") 

if not url.endswith("/"):
    url += "/"


supabase: Client = create_client(url, key)