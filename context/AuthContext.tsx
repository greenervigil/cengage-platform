import { createContext, useContext, useEffect, useState } from "react";
//import { getUserProfile } from 'common-experience-client';

export interface AuthProps {
    ssoEmail: string,
    ssoFirstName: string,
    ssoLastName: string,
    ssoGUID: string,
    ssoRole: string,
    ssoInstitution: string,
    ssoISBN: string,
    ssoCourseKey: string,
    ssoCGI: string,
    ssoIsGatewayCourse: string
};

export interface AuthProviderValue {
    authState: AuthProps;
    setAuthState: (authState: AuthProps) => void;
}

const defaultAuthProps = {
    ssoEmail: 'slkjasd@gmail.com',
    ssoFirstName: 'Lettuce',
    ssoLastName: 'Fields',
    ssoGUID: '1',
    ssoRole: '1',
    ssoInstitution: 'ucls',
    ssoISBN: '11221',
    ssoCourseKey: '37',
    ssoCGI: 'dsahk',
    ssoIsGatewayCourse: 'dada',
};

const AuthContext = createContext<AuthProviderValue | undefined>(undefined);

const AuthProvider: React.FC = ({children}) => {
    const [authState, setAuthState] = useState(defaultAuthProps);

    // TODO:  MTS-12283 call getUserData to update
    /*useEffect(() => {
        let user = getUserProfile;
        console.log(user);
    })*/

    return (
        <AuthContext.Provider value={{ authState, setAuthState }}>
            {children}
        </AuthContext.Provider>
    )
}

const useAuthContext: React.ReactNode = () => {
    const context = useContext(AuthContext);

    if (context === undefined) {
        throw new Error('unacceptable use of context outside of provider');
    }

    return context;
}

export {AuthContext, AuthProvider, useAuthContext};

function getUserData(getUserData: any) {
    throw new Error("Function not implemented.");
}
