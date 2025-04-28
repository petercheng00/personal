find . -type f \( -iname "*.jpg" -o -iname "*.jpeg" \) -exec exiftran -ai {} \;
