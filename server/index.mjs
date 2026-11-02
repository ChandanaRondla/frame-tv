import 'dotenv/config';
import {createServer} from 'node:http';
import {createYoga,createSchema} from 'graphql-yoga';
const token=process.env.TMDB_ACCESS_TOKEN;
const base='https://api.themoviedb.org/3';
const categorySpecs=[
 ['Trending Movies','trending/movie/week'],['Trending Series','trending/tv/week'],
 ['Popular Movies','movie/popular'],['Popular Series','tv/popular'],
 ['Top Rated Films','movie/top_rated'],['Top Rated Series','tv/top_rated'],
 ['Now Playing','movie/now_playing'],['On TV','tv/on_the_air'],
 ['Action & Adventure','discover/movie?with_genres=28'],['Comedy','discover/movie?with_genres=35'],
 ['Drama','discover/movie?with_genres=18'],['Science Fiction','discover/movie?with_genres=878'],
 ['Mystery','discover/movie?with_genres=9648'],['Animation','discover/movie?with_genres=16'],
 ['Documentaries','discover/movie?with_genres=99'],['Thrillers','discover/movie?with_genres=53'],
 ['Fantasy','discover/movie?with_genres=14'],['Romance','discover/movie?with_genres=10749'],
 ['Crime','discover/movie?with_genres=80'],['Family','discover/movie?with_genres=10751'],
 ['Horror','discover/movie?with_genres=27'],['History','discover/movie?with_genres=36'],
 ['Music','discover/movie?with_genres=10402'],['Adventure','discover/movie?with_genres=12'],
 ['War','discover/movie?with_genres=10752'],['Western','discover/movie?with_genres=37'],
 ['Action Series','discover/tv?with_genres=10759'],['Comedy Series','discover/tv?with_genres=35'],
 ['Drama Series','discover/tv?with_genres=18'],['Sci-Fi Series','discover/tv?with_genres=10765'],
 ['Crime Series','discover/tv?with_genres=80'],['Mystery Series','discover/tv?with_genres=9648'],
 ['Animation Series','discover/tv?with_genres=16'],['Documentary Series','discover/tv?with_genres=99'],
 ['Family Series','discover/tv?with_genres=10751'],['Reality','discover/tv?with_genres=10764'],
 ['Kids','discover/tv?with_genres=10762'],['War & Politics','discover/tv?with_genres=10768'],
 ['Talk Shows','discover/tv?with_genres=10767'],['History & Culture','discover/tv?with_genres=36']
];
const cache=new Map();
async function tmdb(path){if(!token)throw new Error('TMDB_ACCESS_TOKEN missing: create .env');const url=new URL(`${base}/${path}`);url.searchParams.set('language','en-US');const response=await fetch(url,{headers:{Authorization:`Bearer ${token}`,Accept:'application/json'}});if(!response.ok)throw new Error(`TMDB HTTP ${response.status}`);return response.json()}
function normalize(m,kind){const tv=kind==='tv';return {id:`${tv?'tv':'movie'}-${m.id}`,tmdbId:m.id,kind,name:m.title||m.name||'Untitled',year:Number((m.release_date||m.first_air_date||'').slice(0,4))||0,genre:tv?'Series':'Film',description:m.overview||'No synopsis available.',poster:m.poster_path,backdrop:m.backdrop_path,rating:m.vote_average||0}}
async function catalog(){const hit=cache.get('catalog');if(hit&&hit.expires>Date.now())return hit.value;const rows=[];for(let i=0;i<categorySpecs.length;i+=5){const batch=categorySpecs.slice(i,i+5);const results=await Promise.all(batch.map(async([label,path],j)=>{const tv=path.includes('/tv')||path.includes('trending/tv');const data=await tmdb(`${path}${path.includes('?')?'&':'?'}page=1`);return {id:i+j,label,items:(data.results||[]).filter(x=>x.backdrop_path||x.poster_path).map(x=>normalize(x,tv?'tv':'movie'))}}));rows.push(...results)}const value={rows,uniqueTitles:new Set(rows.flatMap(r=>r.items.map(t=>t.id))).size,source:'TMDB live metadata'};cache.set('catalog',{value,expires:Date.now()+30*60*1000});return value}
async function search(query){if(!query.trim())return [];const [movies,series]=await Promise.all([tmdb(`search/movie?query=${encodeURIComponent(query)}&page=1`),tmdb(`search/tv?query=${encodeURIComponent(query)}&page=1`)]);return [...(movies.results||[]).map(m=>normalize(m,'movie')),...(series.results||[]).map(m=>normalize(m,'tv'))].slice(0,35)}
async function trailer(kind,id){const data=await tmdb(`${kind}/${id}/videos`);const videos=(data.results||[]).filter(v=>v.site==='YouTube'&&v.type==='Trailer'&&/^[\w-]{11}$/.test(v.key));return videos.find(v=>v.official)||videos[0]||null}
const schema=createSchema({typeDefs:`type Title {id:ID!,tmdbId:Int!,kind:String!,name:String!,year:Int!,genre:String!,description:String!,poster:String,backdrop:String,rating:Float!} type Row {id:Int!,label:String!,items:[Title!]!} type Catalog {rows:[Row!]!,uniqueTitles:Int!,source:String!} type Trailer {key:String!,name:String!,official:Boolean} type Query {catalog:Catalog!,search(query:String!):[Title!]!,trailer(kind:String!,id:Int!):Trailer,health:String!}`,
 resolvers:{Query:{catalog:()=>catalog(),search:(_,{query})=>search(query),trailer:(_,{kind,id})=>{if(!['tv','movie'].includes(kind))throw new Error('Invalid media kind');return trailer(kind,id)},health:()=>token?'ready':'missing TMDB token'}}});
const yoga=createYoga({schema,graphqlEndpoint:'/graphql',maskedErrors:true});
createServer(yoga).listen(Number(process.env.PORT||4000),()=>console.log('GraphQL ready at http://localhost:4000/graphql'));
