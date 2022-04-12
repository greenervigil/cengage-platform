import React from 'react';
import { AuthenticationResponse } from 'common-experience-client';
import DevLoginForm from "../components/forms/dev-login-form";
import ClassList from '../components/class-list/class-list';
import { NextPage } from 'next';

const Login: NextPage = () => {
    const [userData, setUserData] = React.useState<AuthenticationResponse>();
    return <>{userData ? <ClassList userData={userData} /> : <DevLoginForm setUserData={setUserData} />}</>;
}

export default Login;