import {redirect} from 'next/navigation';

export default function TexturesPage(){
  redirect('/products?by=texture');
}
