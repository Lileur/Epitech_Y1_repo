<?php

$user = 'root';
$mdp = '';

try
{
    $db = new PDO ("mysql:host=localhost;dbname=fullstack_website",$user,$mdp);
    foreach ($db->query('SELECT * FROM users') as $row) {
        print_r($row);
    }
}
catch (PDOExeption $e)
{
    print "Erreur :". $e->getMessage() . "</br>";
    die;
}



?>
