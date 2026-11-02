import {defineConfig} from 'vite';
export default defineConfig({server:{proxy:{'/graphql':{target:'http://localhost:4000',changeOrigin:true}}},build:{target:'es2022'}});
