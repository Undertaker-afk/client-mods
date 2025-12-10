
# How to use Anticlient

1. **Install Local Mods Repo**:
   - The mods are located in `mcraft-client-mods-main`.
   - You need to host this directory or just copy the absolute path of `mcraft-client-mods-main` if the browser allows file access (unlikely for web).
   - Better way: Serve this folder. Run `npx serve .` in `mcraft-client-mods-main`.
   
2. **Add Repository in Client**:
   - Open the Minecraft Web Client.
   - Go to **Mods > Manage Repositories > Add Repository**.
   - URL: `http://localhost:3000` (or whatever port `serve` uses).
   
3. **Install Anticlient**:
   - Find "Anticlient" in the list.
   - Click **Install**.
   - Reload the page.

4. **Usage**:
   - Press **Right Arrow** to open the Menu.
   - Use the mouse to toggle modules.
   - **Killaura**: Attacks enemies (range 4.5).
   - **Flight**: Fly like creative (G/V/Space/Shift).
   - **Speed**: Go faster.
   - **ESP**: Shows boxes around players (Requires reload after enable if using separate backend).
   - **Jesus**: Walk on water.
   
   **Enjoy!**
