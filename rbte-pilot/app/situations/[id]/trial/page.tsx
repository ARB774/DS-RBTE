import { StepPage } from '@/app/components/step-page';
export default async function Page({params}:{params:Promise<{id:string}>}) { const {id}=await params; return <StepPage id={id} step="trial"/>; }
