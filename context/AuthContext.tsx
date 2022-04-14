import { UserService } from "common-experience-client";
import { createContext, useContext, useEffect, useState } from "react";

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
    ssoEmail: '',
    ssoFirstName: '',
    ssoLastName: '',
    ssoGUID: '',
    ssoRole: '',
    ssoInstitution: '',
    ssoISBN: '',
    ssoCourseKey: '',
    ssoCGI: '',
    ssoIsGatewayCourse: '',
};

const AuthContext = createContext<AuthProviderValue | undefined>(undefined);

const AuthProvider: React.FC = ({children}) => {
    const [authState, setAuthState] = useState(defaultAuthProps);

    // TODO:  MTS-12283 call getUserData to update

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
